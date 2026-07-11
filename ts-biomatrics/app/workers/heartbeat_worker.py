from PySide6.QtCore import QThread, Signal
from app.database.database import SessionLocal
from app.database.models import RawBiometricLog, BiometricDevice
from app.services.queue_service import QueueService
from app.core.logger import get_logger

logger = get_logger("Heartbeat Worker")

class HeartbeatWorker(QThread):
    """
    Background worker to send a gateway heartbeat to the cloud.
    """
    finished = Signal(bool, str) # success, message

    def run(self):
        logger.info("HeartbeatWorker: Preparing gateway heartbeat payload...")
        db = SessionLocal()
        client = QueueService.get_api_client(db)
        
        if not client:
            msg = "Gateway not configured. Heartbeat skipped."
            logger.warning(msg)
            self.finished.emit(False, msg)
            db.close()
            return

        try:
            # Gather statistics for payload
            pending_logs = db.query(RawBiometricLog).filter(RawBiometricLog.sync_status == "PENDING").count()
            failed_logs = db.query(RawBiometricLog).filter(RawBiometricLog.sync_status == "FAILED").count()
            active_devices = db.query(BiometricDevice).filter(BiometricDevice.is_enabled == True).count()

            success, error_msg = client.send_heartbeat(
                status="ONLINE",
                pending_logs=pending_logs,
                failed_logs=failed_logs,
                active_devices=active_devices
            )

            if success:
                logger.info("HeartbeatWorker: Heartbeat successfully sent.")
                self.finished.emit(True, "Heartbeat Successful")
            else:
                logger.warning(f"HeartbeatWorker: Heartbeat failed: {error_msg}")
                # Save to retry queue
                QueueService.enqueue(
                    db=db,
                    operation_type="HEARTBEAT",
                    payload={
                        "status": "ONLINE",
                        "pendingLogs": pending_logs,
                        "failedLogs": failed_logs,
                        "activeDevices": active_devices
                    }
                )
                self.finished.emit(False, f"Heartbeat failed: {error_msg}")

        except Exception as e:
            logger.error(f"HeartbeatWorker: Error during execution: {e}")
            self.finished.emit(False, str(e))
        finally:
            db.close()
