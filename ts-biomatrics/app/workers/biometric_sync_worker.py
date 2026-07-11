from PySide6.QtCore import QThread, Signal
from app.services.sync_service import SyncService
from app.core.logger import get_logger

logger = get_logger("Biometric Sync Worker")

class BiometricSyncWorker(QThread):
    """
    Background worker to fetch attendance logs from biometric devices and sync them to the cloud.
    """
    # Emits: success_count, failed_count, message
    finished = Signal(int, int, str)

    def __init__(self, device_id=None, parent=None):
        super().__init__(parent)
        self.device_id = device_id

    def run(self):
        logger.info("BiometricSyncWorker: Starting biometric sync...")
        try:
            if self.device_id is not None:
                success, failed, msg = SyncService.sync_device(self.device_id)
            else:
                success, failed, msg = SyncService.sync_all_devices()
                
            self.finished.emit(success, failed, msg)
        except Exception as e:
            logger.error(f"BiometricSyncWorker: Error in biometric sync: {e}")
            self.finished.emit(0, 0, f"Error: {str(e)}")
