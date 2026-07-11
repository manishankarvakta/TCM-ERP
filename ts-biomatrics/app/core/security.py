import base64
import uuid
import bcrypt
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.fernet import Fernet
from app.core.config import ENCRYPTION_SALT

# Derive machine-bound Fernet key
def get_fernet_key() -> bytes:
    """
    Derives a symmetric encryption key bound to the local machine's unique ID and stored salt.
    """
    machine_id = str(uuid.getnode()).encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=ENCRYPTION_SALT,
        iterations=10000, # Fast enough for app load but secure
    )
    return base64.urlsafe_b64encode(kdf.derive(machine_id))

def encrypt_data(data: str) -> str:
    """
    Encrypts a string using the machine-bound key.
    """
    if not data:
        return ""
    f = Fernet(get_fernet_key())
    return f.encrypt(data.encode('utf-8')).decode('utf-8')

def decrypt_data(token: str) -> str:
    """
    Decrypts an encrypted string using the machine-bound key.
    """
    if not token:
        return ""
    try:
        f = Fernet(get_fernet_key())
        return f.decrypt(token.encode('utf-8')).decode('utf-8')
    except Exception:
        # Fallback if key derivation/decryption fails
        return ""

# Password hashing functions
def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a password against its bcrypt hash.
    """
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False
