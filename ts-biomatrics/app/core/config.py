import os
import sys
from pathlib import Path

# Base Directory (resolves correctly for PyInstaller single-file build)
if hasattr(sys, '_MEIPASS'):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Application details
APP_NAME = "TS-Biomatrics"
APP_VERSION = "1.0.0"
GATEWAY_PROTOCOL_VERSION = "1.0"
DATABASE_VERSION = "1.0"

# Application Data Directory
# On Windows: AppData/Local/TS-Biomatrics
# On macOS/Linux: ~/.ts-biomatrics
if os.name == 'nt':
    APP_DATA_DIR = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / APP_NAME
else:
    APP_DATA_DIR = Path.home() / f".{APP_NAME.lower()}"

# Create directories
APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR = APP_DATA_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_LOG_PATH = LOGS_DIR / "app.log"
BACKUPS_DIR = APP_DATA_DIR / "backups"
BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

# Default Database Path
DEFAULT_DB_PATH = APP_DATA_DIR / "ts_biomatrics.db"
DB_URL = os.environ.get("TS_BIOMETRICS_DB_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# Secure Salt for local encryption key derivation
ENCRYPTION_SALT_FILE = APP_DATA_DIR / ".encryption_salt"
if not ENCRYPTION_SALT_FILE.exists():
    import secrets
    ENCRYPTION_SALT_FILE.write_bytes(secrets.token_bytes(16))
ENCRYPTION_SALT = ENCRYPTION_SALT_FILE.read_bytes()
