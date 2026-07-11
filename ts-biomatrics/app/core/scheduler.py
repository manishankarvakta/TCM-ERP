import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.sync_service import SyncService
from app.services.queue_service import QueueService
from app.database.database import SessionLocal
from app.database.models import AppConfig, RawBiometricLog, BiometricDevice
from app.workers.heartbeat_worker import HeartbeatWorker
from app.workers.device_status_worker import DeviceStatusWorker
from app.workers.mapping_sync_worker import MappingSyncWorker
from app.core.logger import get_logger

logger = get_logger("Scheduler")

# Active instances
_scheduler = None

# Job executions (non-QThread versions for pure background scheduler context)
def job_heartbeat():
    logger.info("Scheduler Trigger: Sending Heartbeat...")
    db = SessionLocal()
    client = QueueService.get_api_client(db)
    if not client:
        db.close()
        return
        
    try:
        pending = db.query(RawBiometricLog).filter(RawBiometricLog.sync_status == "PENDING").count()
        failed = db.query(RawBiometricLog).filter(RawBiometricLog.sync_status == "FAILED").count()
        active = db.query(BiometricDevice).filter(BiometricDevice.is_enabled == True).count()
        
        success, err = client.send_heartbeat("ONLINE", pending, failed, active)
        if not success:
            QueueService.enqueue(db, "HEARTBEAT", {
                "status": "ONLINE", "pendingLogs": pending, "failedLogs": failed, "activeDevices": active
            })
    except Exception as e:
        logger.error(f"Scheduler Heartbeat job failed: {e}")
    finally:
        db.close()

def job_device_status():
    logger.info("Scheduler Trigger: Checking device online status...")
    # Instantiate status worker and run it inside thread pool context
    worker = DeviceStatusWorker()
    worker.start()
    worker.wait() # Run synchronously inside scheduler thread

def job_retry_queue():
    logger.info("Scheduler Trigger: Processing failed sync retry queue...")
    try:
        success, failed = QueueService.process_queue()
        if success > 0 or failed > 0:
            logger.info(f"Retry Queue processed. Successes: {success}, Failures: {failed}")
    except Exception as e:
        logger.error(f"Scheduler Retry Queue job failed: {e}")

def job_biometric_sync():
    logger.info("Scheduler Trigger: Pulling and syncing attendance logs...")
    try:
        success, failed, msg = SyncService.sync_all_devices()
        logger.info(f"Biometric sync complete. Success: {success}, Failed: {failed}. Message: {msg}")
    except Exception as e:
        logger.error(f"Scheduler Biometric Sync job failed: {e}")

def job_mappings_sync():
    logger.info("Scheduler Trigger: Syncing user mappings from cloud...")
    worker = MappingSyncWorker()
    worker.start()
    worker.wait()

def job_config_sync():
    logger.info("Scheduler Trigger: Syncing device configurations from cloud...")
    try:
        from app.services.sync_service import SyncService
        SyncService.sync_devices_from_cloud()
    except Exception as e:
        logger.error(f"Scheduler Device Config Sync job failed: {e}")

def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return
        
    _scheduler = BackgroundScheduler()
    
    # 1. Load intervals from DB
    db = SessionLocal()
    config = db.query(AppConfig).first()
    db.close()
    
    sync_interval_sec = config.sync_interval if config else 120
    
    # Standard intervals (as per specifications section 9)
    # Heartbeat & status: 30 seconds
    # Retry Queue: 60 seconds (1 minute)
    # Sync logs: configurable (e.g. 120 seconds)
    # Mappings & Config: 300 seconds (5 minutes)
    
    _scheduler.add_job(job_heartbeat, 'interval', seconds=30, id='job_heartbeat')
    _scheduler.add_job(job_device_status, 'interval', seconds=30, id='job_device_status')
    _scheduler.add_job(job_retry_queue, 'interval', seconds=60, id='job_retry_queue')
    _scheduler.add_job(job_biometric_sync, 'interval', seconds=sync_interval_sec, id='job_biometric_sync')
    _scheduler.add_job(job_mappings_sync, 'interval', seconds=300, id='job_mappings_sync')
    _scheduler.add_job(job_config_sync, 'interval', seconds=300, id='job_config_sync')
    
    _scheduler.start()
    logger.info("Background scheduler successfully started.")

def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        logger.info("Background scheduler stopped.")

def reschedule_sync_job(seconds: int):
    global _scheduler
    if _scheduler and _scheduler.running:
        try:
            _scheduler.reschedule_job('job_biometric_sync', trigger='interval', seconds=seconds)
            logger.info(f"Biometric sync job rescheduled to execute every {seconds} seconds.")
        except Exception as e:
            logger.error(f"Failed to reschedule biometric sync job: {e}")
