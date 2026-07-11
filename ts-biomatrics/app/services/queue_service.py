import json
import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.database.models import SyncQueue, AppConfig, SyncHistory
from app.core.security import decrypt_data
from app.api.client import GatewayApiClient
from app.core.logger import get_logger

logger = get_logger("Sync Queue")

# Retry backoff mapping: retry_count -> minutes to wait before next attempt
RETRY_BACKOFF = {
    0: 1,   # Attempt 2: after 1 minute
    1: 5,   # Attempt 3: after 5 minutes
    2: 15,  # Attempt 4: after 15 minutes
    3: 30,  # Attempt 5: after 30 minutes
}
MAX_RETRIES = 4

class QueueService:
    """
    Service for managing the offline synchronization queue and processing retries.
    """
    @staticmethod
    def get_api_client(db: Session) -> Optional[GatewayApiClient]:
        """
        Helper to construct the GatewayApiClient using current database configuration.
        """
        config = db.query(AppConfig).first()
        if not config or not config.setup_completed:
            return None
        decrypted_api_key = decrypt_data(config.api_key)
        return GatewayApiClient(
            base_url=config.app_url,
            api_key=decrypted_api_key,
            gateway_id=config.gateway_id,
            installation_id=config.installation_id
        )

    @classmethod
    def enqueue(cls, db: Session, operation_type: str, payload: dict) -> SyncQueue:
        """
        Queues a failed sync operation for background retries.
        """
        now = datetime.datetime.utcnow()
        next_attempt = now + datetime.timedelta(minutes=RETRY_BACKOFF.get(0, 1))
        
        job = SyncQueue(
            operation_type=operation_type,
            payload=json.dumps(payload),
            status="PENDING",
            retry_count=0,
            last_attempt=now,
            next_retry=next_attempt
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        logger.info(f"Queued failed {operation_type} operation for retry at {next_attempt.strftime('%Y-%m-%d %H:%M:%S')}")
        return job

    @classmethod
    def process_queue(cls) -> Tuple[int, int]:
        """
        Processes pending jobs in the queue whose next_retry timestamp has passed.
        Returns (success_count, failed_count)
        """
        db = SessionLocal()
        client = cls.get_api_client(db)
        if not client:
            db.close()
            return 0, 0

        now = datetime.datetime.utcnow()
        jobs = db.query(SyncQueue).filter(
            SyncQueue.status != "COMPLETED",
            SyncQueue.retry_count <= MAX_RETRIES,
            SyncQueue.next_retry <= now
        ).all()

        if not jobs:
            db.close()
            return 0, 0

        logger.info(f"Processing {len(jobs)} pending jobs in retry queue...")
        successes = 0
        failures = 0

        for job in jobs:
            payload = json.loads(job.payload)
            job.last_attempt = now
            
            success = False
            error_msg = ""

            try:
                if job.operation_type == "BIOMETRIC_SYNC":
                    # Payload: { "vendor": str, "device_id": str, "formatted_punches": [...] }
                    success, error_msg = client.sync_biometric_logs(
                        vendor=payload["vendor"],
                        device_id=payload["device_id"],
                        formatted_punches=payload["formatted_punches"]
                    )
                elif job.operation_type == "USER_MAPPING":
                    # Payload: { "reports": [...] }
                    success, error_msg = client.update_user_mappings(reports=payload["reports"])
                elif job.operation_type == "HEARTBEAT":
                    # Payload: { "status": str, "pendingLogs": int, "failedLogs": int, "activeDevices": int }
                    success, error_msg = client.send_heartbeat(
                        status=payload["status"],
                        pending_logs=payload["pendingLogs"],
                        failed_logs=payload["failedLogs"],
                        active_devices=payload["activeDevices"]
                    )
                else:
                    error_msg = f"Unknown operation type: {job.operation_type}"
            except Exception as e:
                error_msg = str(e)

            if success:
                job.status = "COMPLETED"
                job.error_message = None
                successes += 1
                logger.info(f"Successfully processed queued job {job.id} ({job.operation_type})")
            else:
                job.retry_count += 1
                job.error_message = error_msg
                if job.retry_count > MAX_RETRIES:
                    job.status = "FAILED"
                    logger.error(f"Job {job.id} ({job.operation_type}) permanently failed after exceeding retry limit. Error: {error_msg}")
                else:
                    wait_minutes = RETRY_BACKOFF.get(job.retry_count, 30)
                    job.next_retry = now + datetime.timedelta(minutes=wait_minutes)
                    job.status = "PENDING"
                    logger.warning(f"Job {job.id} ({job.operation_type}) failed. Rescheduled for attempt {job.retry_count + 1} at {job.next_retry.strftime('%Y-%m-%d %H:%M:%S')}. Error: {error_msg}")
                failures += 1
            
            db.commit()

        db.close()
        return successes, failures
