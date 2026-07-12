import datetime
import json
from typing import Tuple
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.database.models import BiometricDevice, RawBiometricLog, SyncHistory, UserMapping
from app.devices.manager import DeviceManager
from app.services.queue_service import QueueService
from app.core.logger import get_logger
from app.core.config import ALLOW_MOCK_MODE

logger = get_logger("Synchronization")

class SyncService:
    """
    Core service for pulling biometric punches from local devices and synchronizing them with the cloud.
    """
    @classmethod
    def sync_device(cls, device_id: int) -> Tuple[int, int, str]:
        """
        Pulls attendance records from a specific device, deduplicates, formats, and uploads.
        Returns (success_count, failed_count, status_message)
        """
        db = SessionLocal()
        device = db.query(BiometricDevice).filter(BiometricDevice.id == device_id).first()
        if not device:
            db.close()
            return 0, 0, "Device not found"

        if not device.is_enabled:
            db.close()
            return 0, 0, "Device is disabled"

        # 1. Determine last sync check (or default to 24 hours ago)
        # Find the latest successfully synced record timestamp for this device
        last_punch = db.query(RawBiometricLog).filter(
            RawBiometricLog.device_id == device.id,
            RawBiometricLog.sync_status == "SYNCED"
        ).order_by(RawBiometricLog.punch_time.desc()).first()

        start_time = last_punch.punch_time if last_punch else (datetime.datetime.utcnow() - datetime.timedelta(days=1))

        # 2. Connect to device & pull logs
        adapter = DeviceManager.get_adapter(
            device_id=device.id,
            vendor=device.vendor,
            name=device.name,
            ip_address=device.ip_address,
            port=device.port,
            username="admin", # Default fallback
            password=device.cloud_device_id # We can reuse cloud_device_id or other fields, or pass None
        )
        
        logger.info(f"Connecting to device {device.name} ({device.ip_address}) to pull punches...")
        if not adapter.connect():
            device.status = "OFFLINE"
            db.commit()
            db.close()
            return 0, 0, "Failed to connect to device"

        device.status = "ONLINE"
        device.last_connection = datetime.datetime.utcnow()
        db.commit()

        pulled_logs = adapter.get_attendance_logs(start_time=start_time)
        adapter.disconnect()

        logger.info(f"Pulled {len(pulled_logs)} punches from {device.name} since {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        if not pulled_logs:
            device.last_sync = datetime.datetime.utcnow()
            db.commit()
            db.close()
            return 0, 0, "No new punches to sync"

        # 3. Deduplicate and save raw logs locally
        saved_logs = []
        for log in pulled_logs:
            # Check if this punch already exists locally
            exists = db.query(RawBiometricLog).filter(
                RawBiometricLog.device_id == device.id,
                RawBiometricLog.device_user_id == log["device_user_id"],
                RawBiometricLog.punch_time == log["timestamp"]
            ).first()

            if not exists:
                raw_log = RawBiometricLog(
                    device_id=device.id,
                    device_user_id=log["device_user_id"],
                    punch_time=log["timestamp"],
                    verification_method=log["verify_mode"],
                    raw_payload=json.dumps(log["raw_payload"]),
                    sync_status="PENDING"
                )
                db.add(raw_log)
                saved_logs.append(raw_log)

        if not saved_logs:
            device.last_sync = datetime.datetime.utcnow()
            db.commit()
            db.close()
            return 0, 0, "All pulled punches are already cached locally"

        db.commit() # Save raw logs to DB
        logger.info(f"Saved {len(saved_logs)} new unique punches locally for {device.name}.")

        # 4. Format punches for Cloud ERP upload
        formatted_punches = []
        for log in saved_logs:
            # Prevent mock punches from uploading to production cloud ERP
            payload_data = json.loads(log.raw_payload) if log.raw_payload else {}
            if payload_data.get("mock") and not ALLOW_MOCK_MODE:
                logger.warning(f"Production Guard: Bypassing mock record upload for device {device.name}, user {log.device_user_id}")
                # Mark as completed locally so it is cleared from local cache queues, but do not send
                log.sync_status = "SYNCED"
                log.processing_status = "COMPLETED"
                continue

            v = device.vendor.lower()
            if "zkteco" in v:
                date_part = log.punch_time.strftime("%Y-%m-%d")
                time_part = log.punch_time.strftime("%H:%M:%S")
                formatted_punches.append({
                    "EnrollNumber": log.device_user_id,
                    "Date": date_part,
                    "Time": time_part,
                    "DeviceID": device.cloud_device_id or str(device.id)
                })
            elif "hikvision" in v:
                formatted_punches.append({
                    "employeeNoString": log.device_user_id,
                    "time": log.punch_time.isoformat(),
                    "deviceId": device.cloud_device_id or str(device.id)
                })
            else:
                formatted_punches.append(payload_data)

        # 5. Push formatted punches to cloud API
        client = QueueService.get_api_client(db)
        success = False
        error_msg = ""
        
        # Track history
        history = SyncHistory(
            operation=f"PULL_SYNC:{device.name}",
            start_time=datetime.datetime.utcnow(),
            status="PENDING"
        )
        db.add(history)
        db.commit()

        if client:
            try:
                success, error_msg = client.sync_biometric_logs(
                    vendor=device.vendor,
                    device_id=device.cloud_device_id or str(device.id),
                    formatted_punches=formatted_punches
                )
            except Exception as e:
                success = False
                error_msg = str(e)
        else:
            error_msg = "Gateway client offline/unconfigured"

        # 6. Update local logs and queue if failed
        now = datetime.datetime.utcnow()
        if success:
            for log in saved_logs:
                log.sync_status = "SYNCED"
                log.processing_status = "COMPLETED"
            device.last_sync = now
            history.status = "SUCCESS"
            history.success_count = len(saved_logs)
            logger.info(f"Successfully synced {len(saved_logs)} records to cloud ERP for {device.name}")
        else:
            logger.warning(f"Cloud sync failed for {device.name}: {error_msg}. Queueing for background retry.")
            for log in saved_logs:
                log.sync_status = "FAILED"
            
            # Queue the formatted batch for offline retry
            QueueService.enqueue(
                db=db,
                operation_type="BIOMETRIC_SYNC",
                payload={
                    "vendor": device.vendor,
                    "device_id": device.cloud_device_id or str(device.id),
                    "formatted_punches": formatted_punches
                }
            )
            history.status = "FAILED"
            history.failed_count = len(saved_logs)
            history.error_details = error_msg

        history.end_time = datetime.datetime.utcnow()
        db.commit()
        db.close()

        if success:
            return len(saved_logs), 0, "Sync Successful"
        else:
            return 0, len(saved_logs), f"Local cache complete. Sync queued: {error_msg}"

    @classmethod
    def sync_all_devices(cls) -> Tuple[int, int, str]:
        """
        Syncs all enabled biometric devices in sequence.
        """
        db = SessionLocal()
        devices = db.query(BiometricDevice).filter(BiometricDevice.is_enabled == True).all()
        db.close()

        if not devices:
            return 0, 0, "No enabled devices found"

        total_success = 0
        total_failed = 0
        summary_messages = []

        for d in devices:
            success, failed, msg = cls.sync_device(d.id)
            total_success += success
            total_failed += failed
            summary_messages.append(f"{d.name}: {msg}")

        return total_success, total_failed, "; ".join(summary_messages)

    @classmethod
    def sync_devices_from_cloud(cls) -> Tuple[bool, str]:
        """
        1. Fetch devices list from server.
        2. Update local database.
        3. Check local network status (pings/connection checks).
        4. Post device status reports back to cloud server.
        """
        db = SessionLocal()
        client = QueueService.get_api_client(db)
        if not client:
            db.close()
            return False, "Gateway client offline/unconfigured"

        logger.info("Syncing device configurations from cloud server...")
        success, cloud_devices, error = client.get_config()
        if not success:
            db.close()
            return False, f"Failed to fetch config from cloud: {error}"

        logger.info(f"Fetched {len(cloud_devices)} devices configuration from cloud.")
        
        reports = []
        for dev_data in cloud_devices:
            cloud_id = dev_data.get("id") or dev_data.get("deviceId")
            name = dev_data.get("name")
            vendor = dev_data.get("vendor", "zkteco")
            ip_address = dev_data.get("ipAddress") or dev_data.get("ip_address")
            port = int(dev_data.get("port") or 4370)
            is_enabled = dev_data.get("isEnabled") or dev_data.get("is_enabled", True)

            # Check if device already exists locally
            local_device = db.query(BiometricDevice).filter(BiometricDevice.cloud_device_id == cloud_id).first()
            if not local_device:
                local_device = BiometricDevice(cloud_device_id=cloud_id)
                db.add(local_device)

            local_device.name = name
            local_device.vendor = vendor
            local_device.ip_address = ip_address
            local_device.port = port
            local_device.is_enabled = is_enabled
            db.commit()

            # Check status on local network (ping/connection test)
            logger.info(f"Checking connectivity for device {name} at {ip_address}:{port}...")
            adapter = DeviceManager.get_adapter(
                device_id=local_device.id,
                vendor=vendor,
                name=name,
                ip_address=ip_address,
                port=port,
                username="admin",
                password=cloud_id
            )
            
            reachable = adapter.connect()
            if reachable:
                try:
                    info = adapter.get_device_info()
                    local_device.model = info.get("model")
                    local_device.serial_number = info.get("serial_number")
                    local_device.firmware_version = info.get("firmware_version")
                    local_device.user_count = info.get("user_count", 0)
                    local_device.log_count = info.get("attendance_log_count", 0)
                except Exception as ex:
                    logger.warning(f"Failed to fetch metadata from online device {name}: {ex}")
                
                adapter.disconnect()
                local_device.status = "ONLINE"
                local_device.last_connection = datetime.datetime.utcnow()
            else:
                local_device.status = "OFFLINE"
            db.commit()

            reports.append({
                "deviceId": cloud_id,
                "reachable": reachable,
                "lastCheckedAt": datetime.datetime.utcnow().isoformat() + "Z"
            })

        # Report status back to cloud
        logger.info("Reporting checked device statuses back to cloud server...")
        status_success, status_error = client.update_device_status(reports)
        if not status_success:
            logger.warning(f"Failed to post device statuses back to cloud: {status_error}")

        db.close()
        return True, "Devices inventory sync and diagnostics completed."
