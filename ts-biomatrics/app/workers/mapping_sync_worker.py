import datetime
from PySide6.QtCore import QThread, Signal
from app.database.database import SessionLocal
from app.database.models import BiometricDevice, UserMapping
from app.services.queue_service import QueueService
from app.core.logger import get_logger

logger = get_logger("Mapping Sync Worker")

class MappingSyncWorker(QThread):
    """
    Background worker to fetch user mappings from the cloud, reconcile them with the local DB, 
    and report sync results back to the cloud.
    """
    finished = Signal(bool, str) # success, message

    def run(self):
        logger.info("MappingSyncWorker: Syncing employee mappings from cloud...")
        db = SessionLocal()
        client = QueueService.get_api_client(db)

        if not client:
            msg = "Gateway not configured. Mapping sync skipped."
            logger.warning(msg)
            self.finished.emit(False, msg)
            db.close()
            return

        try:
            # 1. Fetch mappings from cloud
            success, cloud_mappings, error_msg = client.get_user_mappings()
            if not success:
                logger.error(f"MappingSyncWorker: Failed to fetch mappings from cloud: {error_msg}")
                self.finished.emit(False, f"Fetch failed: {error_msg}")
                db.close()
                return

            logger.info(f"MappingSyncWorker: Received {len(cloud_mappings)} mappings from cloud.")
            
            # Map cloud device IDs to local biometric device integer IDs
            devices = db.query(BiometricDevice).all()
            cloud_id_to_local_id = {d.cloud_device_id: d.id for d in devices if d.cloud_device_id}
            # Fallback mapping using name matches if cloud device ID is not set
            name_to_local_id = {d.name.lower().strip(): d.id for d in devices}

            reports = []
            now = datetime.datetime.utcnow()

            for mapping in cloud_mappings:
                # mapping fields: deviceId (cloud ID), deviceUserId, employeeId, isActive
                cloud_dev_id = mapping.get("deviceId")
                device_user_id = mapping.get("deviceUserId")
                employee_id = mapping.get("employeeId")
                is_active = mapping.get("isActive", True)

                # Find local device
                local_dev_id = cloud_id_to_local_id.get(cloud_dev_id)
                if not local_dev_id:
                    # Let's search by name or cloud_device_id directly
                    # For now, if we can't find it, we skip and report warning
                    logger.warning(f"MappingSyncWorker: Could not find local device matching cloud device ID: {cloud_dev_id}")
                    if cloud_dev_id:
                        reports.append({
                            "deviceId": cloud_dev_id,
                            "deviceUserId": device_user_id,
                            "status": "FAILED",
                            "error": f"Local device with cloud ID '{cloud_dev_id}' not found"
                        })
                    continue

                # Query if mapping already exists in local DB
                local_mapping = db.query(UserMapping).filter(
                    UserMapping.device_id == local_dev_id,
                    UserMapping.device_user_id == str(device_user_id)
                ).first()

                status_label = "MAPPED" if is_active else "DISABLED"
                access_label = "ENABLED" if is_active else "DISABLED"

                if local_mapping:
                    # Update existing mapping
                    local_mapping.cloud_employee_id = str(employee_id)
                    local_mapping.mapping_status = status_label
                    local_mapping.access_status = access_label
                    local_mapping.last_sync = now
                else:
                    # Create new local mapping
                    local_mapping = UserMapping(
                        cloud_employee_id=str(employee_id),
                        device_id=local_dev_id,
                        device_user_id=str(device_user_id),
                        employee_name=f"Employee {employee_id}", # Place holder name
                        mapping_status=status_label,
                        access_status=access_label,
                        last_sync=now
                    )
                    db.add(local_mapping)

                reports.append({
                    "deviceId": cloud_dev_id,
                    "deviceUserId": str(device_user_id),
                    "status": "SYNCED",
                    "error": None
                })

            db.commit() # Save mapping changes locally

            # 2. Report sync status back to the cloud
            if reports:
                report_success, report_error = client.update_user_mappings(reports)
                if report_success:
                    logger.info("MappingSyncWorker: User mappings status reports sent to cloud.")
                    self.finished.emit(True, "Mappings successfully synchronized")
                else:
                    logger.warning(f"MappingSyncWorker: Failed to send user mapping status report: {report_error}")
                    # Save to retry queue
                    QueueService.enqueue(
                        db=db,
                        operation_type="USER_MAPPING",
                        payload={"reports": reports}
                    )
                    self.finished.emit(False, f"Sync complete locally. Cloud status queue: {report_error}")
            else:
                self.finished.emit(True, "No mappings to update")

        except Exception as e:
            logger.error(f"MappingSyncWorker: Uncaught error in mapping sync: {e}")
            self.finished.emit(False, str(e))
        finally:
            db.close()
