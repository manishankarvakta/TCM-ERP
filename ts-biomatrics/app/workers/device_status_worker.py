import datetime
from PySide6.QtCore import QThread, Signal
from app.database.database import SessionLocal
from app.database.models import BiometricDevice
from app.devices.manager import DeviceManager
from app.services.queue_service import QueueService
from app.core.logger import get_logger

logger = get_logger("Device Status Worker")

class DeviceStatusWorker(QThread):
    """
    Background worker to ping and monitor biometric device status, reporting it to the cloud.
    """
    finished = Signal(bool, str) # success, message
    device_status_checked = Signal(int, str, bool) # device_id, name, is_online

    def run(self):
        logger.info("DeviceStatusWorker: Starting device status checks...")
        db = SessionLocal()
        devices = db.query(BiometricDevice).filter(BiometricDevice.is_enabled == True).all()
        
        if not devices:
            self.finished.emit(True, "No active devices to check")
            db.close()
            return

        client = QueueService.get_api_client(db)
        device_reports = []
        now_str = datetime.datetime.utcnow().isoformat()

        for device in devices:
            adapter = DeviceManager.get_adapter(
                device_id=device.id,
                vendor=device.vendor,
                name=device.name,
                ip_address=device.ip_address,
                port=device.port,
                username="admin",
                password=device.cloud_device_id
            )
            
            try:
                # Run connection test
                reachable, error_msg = adapter.test_connection()
                status = "ONLINE" if reachable else "OFFLINE"
                device.status = status
                device.last_connection = datetime.datetime.utcnow()
                
                if reachable:
                    try:
                        if adapter.connect():
                            info = adapter.get_device_info()
                            device.model = info.get("model")
                            device.serial_number = info.get("serial_number")
                            device.firmware_version = info.get("firmware_version")
                            device.user_count = info.get("user_count", 0)
                            device.log_count = info.get("attendance_log_count", 0)
                            adapter.disconnect()
                    except Exception as meta_err:
                        logger.warning(f"DeviceStatusWorker: Failed to update metadata for {device.name}: {meta_err}")
                
                logger.info(f"DeviceStatusWorker: Device {device.name} at {device.ip_address} is {status}.")
                self.device_status_checked.emit(device.id, device.name, reachable)
                
                if device.cloud_device_id:
                    device_reports.append({
                        "deviceId": device.cloud_device_id,
                        "reachable": reachable,
                        "lastCheckedAt": now_str
                    })
            except Exception as e:
                logger.error(f"DeviceStatusWorker: Failed to ping {device.name}: {e}")
                self.device_status_checked.emit(device.id, device.name, False)
                if device.cloud_device_id:
                    device_reports.append({
                        "deviceId": device.cloud_device_id,
                        "reachable": False,
                        "lastCheckedAt": now_str
                    })

        db.commit() # Save statuses locally

        # Update cloud
        if client and device_reports:
            try:
                success, error = client.update_device_status(device_reports)
                if success:
                    logger.info("DeviceStatusWorker: Device statuses reported to cloud.")
                    self.finished.emit(True, "Device status sync successful")
                else:
                    logger.warning(f"DeviceStatusWorker: Failed to upload status reports: {error}")
                    self.finished.emit(False, f"Cloud report failed: {error}")
            except Exception as e:
                self.finished.emit(False, str(e))
        else:
            self.finished.emit(True, "Device status updated locally (cloud unconfigured)")
            
        db.close()
