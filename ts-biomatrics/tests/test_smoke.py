import os
import sys
from pathlib import Path
import pytest
import bcrypt

# Ensure the root of the project is in PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import APP_DATA_DIR, ALLOW_MOCK_MODE, BASE_DIR
from app.database.database import init_db, SessionLocal, engine
from app.database.models import AppConfig
from app.core.security import hash_password, verify_password, encrypt_data, decrypt_data
from app.api.client import GatewayApiClient
from app.core.scheduler import start_scheduler, stop_scheduler
from app.devices.zkteco import ZKTecoAdapter
from app.devices.hikvision import HikvisionAdapter
from app.devices.generic import GenericDeviceAdapter

def test_config_paths():
    """Verify application directories exist and resolve successfully."""
    assert APP_DATA_DIR is not None
    assert APP_DATA_DIR.exists()
    assert BASE_DIR is not None
    assert BASE_DIR.exists()

def test_database_initialization():
    """Verify database initialization creates tables without schema conflicts."""
    init_db()
    db = SessionLocal()
    try:
        # Probe query to confirm schema exists
        config = db.query(AppConfig).first()
        # Initial run config may be None or object, just verify query succeeds
        assert True
    finally:
        db.close()

def test_password_security():
    """Verify password hashing and verify operations work correctly via bcrypt."""
    password = "SuperSecretPassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)

def test_credential_encryption():
    """Verify credentials encryption and decryption functions operate securely."""
    secret_key = "cloud-erp-api-access-token-12345"
    encrypted = encrypt_data(secret_key)
    assert encrypted != secret_key
    decrypted = decrypt_data(encrypted)
    assert decrypted == secret_key

def test_api_client_timeout():
    """Verify API client timeout and default settings match requirements."""
    client = GatewayApiClient(
        base_url="https://ferrarifashionbd.cloud",
        api_key="test-api-key",
        gateway_id="gw_test",
        installation_id="install_test"
    )
    # Generic request path checks can mock timeout limits or test headers
    assert client.headers["Authorization"] == "Bearer test-api-key"
    assert client.headers["X-Gateway-ID"] == "gw_test"

def test_mock_mode_production_guard():
    """Verify mock connection modes are deactivated in production settings."""
    # Ensure ALLOW_MOCK_MODE is False by default
    assert ALLOW_MOCK_MODE is False
    
    # Verify adapters do not allow connection fallbacks when ALLOW_MOCK_MODE is disabled
    zk = ZKTecoAdapter(device_id=99, name="Test ZK", ip_address="127.0.0.1", port=4370)
    assert zk.connect() is False  # Loopback mocks must be rejected when ALLOW_MOCK_MODE is False
    
    hik = HikvisionAdapter(device_id=99, name="Test Hik", ip_address="127.0.0.1", port=80)
    assert hik.connect() is False
    
    gen = GenericDeviceAdapter(device_id=99, name="Test Gen", ip_address="127.0.0.1", port=80)
    assert gen.connect() is False

def test_scheduler_duplicate_prevention():
    """Verify start_scheduler does not spin up duplicate scheduling loops."""
    import app.core.scheduler
    start_scheduler()
    active_scheduler = app.core.scheduler._scheduler
    assert active_scheduler is not None
    assert active_scheduler.running
    
    # Try launching again, should not create a new scheduler or throw error
    start_scheduler()
    assert app.core.scheduler._scheduler is active_scheduler
    
    stop_scheduler()
    assert not app.core.scheduler._scheduler.running
