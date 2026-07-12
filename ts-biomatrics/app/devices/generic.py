import random
from datetime import datetime, timedelta
import httpx
from typing import List, Dict, Any, Tuple, Optional
from app.devices.base import BaseDeviceAdapter
from app.core.logger import get_logger
from app.core.config import ALLOW_MOCK_MODE

logger = get_logger("Device Connection")

class GenericDeviceAdapter(BaseDeviceAdapter):
    """
    Generic HTTP/TCP device adapter.
    Sends standard HTTP POST/GET requests to fetch biometric data.
    Falls back to mock mode if connection fails or is not HTTP connection type.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._is_mock = False

    def connect(self) -> bool:
        if "mock" in self.ip_address.lower() or self.ip_address == "127.0.0.1":
            if not ALLOW_MOCK_MODE:
                logger.error("Mock device address detected, but Mock Mode is disabled in production settings.")
                return False
            self._is_mock = True
            self.is_connected = True
            logger.info(f"Connected to Generic device '{self.name}' [MOCK MODE]")
            return True
            
        if self.connection_type.upper() in ["HTTP", "HTTPS"]:
            try:
                protocol = self.connection_type.lower()
                url = f"{protocol}://{self.ip_address}:{self.port}/api/device/info"
                res = httpx.get(url, timeout=5.0)
                if res.status_code == 200:
                    self.is_connected = True
                    logger.info(f"Connected to Generic device '{self.name}' at {self.ip_address}:{self.port}")
                    return True
                raise Exception(f"HTTP Status {res.status_code}")
            except Exception as e:
                if ALLOW_MOCK_MODE:
                    logger.warning(f"Failed to connect to real Generic device at {self.ip_address}:{self.port}: {e}. Falling back to MOCK MODE.")
                    self._is_mock = True
                    self.is_connected = True
                    return True
                else:
                    logger.error(f"Failed to connect to real Generic device at {self.ip_address}:{self.port}: {e}")
                    return False
        else:
            if ALLOW_MOCK_MODE:
                self._is_mock = True
                self.is_connected = True
                logger.info(f"Connected to Generic device '{self.name}' [MOCK MODE]")
                return True
            else:
                logger.error(f"Failed to connect to Generic device (invalid connection type and mock disabled)")
                return False

    def disconnect(self) -> None:
        self.is_connected = False

    def test_connection(self) -> Tuple[bool, Optional[str]]:
        if "mock" in self.ip_address.lower() or self.ip_address == "127.0.0.1":
            return True, None
            
        if self.connection_type.upper() in ["HTTP", "HTTPS"]:
            try:
                protocol = self.connection_type.lower()
                url = f"{protocol}://{self.ip_address}:{self.port}/api/device/info"
                res = httpx.get(url, timeout=5.0)
                if res.status_code == 200:
                    return True, None
                return False, f"HTTP Error {res.status_code}"
            except Exception as e:
                if ALLOW_MOCK_MODE:
                    logger.warning(f"Connection test failed for Generic at {self.ip_address}:{self.port}: {e}. Mocking success.")
                    return True, None
                else:
                    logger.error(f"Connection test failed for Generic device: {e}")
                    return False, str(e)
        return True, None

    def get_device_info(self) -> Dict[str, Any]:
        if self._is_mock:
            return {
                "manufacturer": "Generic Vendor",
                "model": "GenAttendance-Mock",
                "serial_number": f"GEN-MOCK-{self.device_id}",
                "firmware_version": "v1.0.0",
                "platform": "Generic Web Device",
                "device_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "user_count": 5,
                "fingerprint_count": 0,
                "face_count": 0,
                "card_count": 5,
                "attendance_log_count": 10,
                "connection_status": "ONLINE"
            }
            
        try:
            protocol = self.connection_type.lower()
            url = f"{protocol}://{self.ip_address}:{self.port}/api/device/info"
            res = httpx.get(url, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                return {
                    "manufacturer": data.get("vendor", "Generic"),
                    "model": data.get("model", "Generic-Device"),
                    "serial_number": data.get("serialNumber", f"GEN-{self.device_id}"),
                    "firmware_version": data.get("firmware", "Unknown"),
                    "platform": "Generic REST Service",
                    "device_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                    "user_count": data.get("userCount", 0),
                    "fingerprint_count": data.get("fingerprintCount", 0),
                    "face_count": data.get("faceCount", 0),
                    "card_count": data.get("cardCount", 0),
                    "attendance_log_count": data.get("logCount", 0),
                    "connection_status": "ONLINE"
                }
            raise Exception(f"HTTP Status {res.status_code}")
        except Exception as e:
            logger.error(f"Failed to fetch Generic device info: {e}")
            return {"error": str(e), "connection_status": "OFFLINE"}

    def get_users(self) -> List[str]:
        if self._is_mock:
            return ["9001", "9002"]
            
        try:
            protocol = self.connection_type.lower()
            url = f"{protocol}://{self.ip_address}:{self.port}/api/device/users"
            res = httpx.get(url, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                return [str(u) for u in data.get("users", [])]
            return []
        except Exception as e:
            logger.error(f"Failed to get Generic users: {e}")
            return []

    def get_attendance_logs(self, start_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        if self._is_mock:
            logs = []
            now = datetime.utcnow()
            for i in range(2):
                user_id = str(random.choice(["9001", "9002"]))
                log_time = now - timedelta(minutes=random.randint(1, 120))
                if start_time and log_time <= start_time:
                    continue
                logs.append({
                    "device_user_id": user_id,
                    "timestamp": log_time,
                    "punch_type": "0",
                    "verify_mode": "1",
                    "work_code": "0",
                    "raw_payload": {"device_id": self.device_id, "mock": True, "time": log_time.isoformat()}
                })
            return logs
            
        try:
            protocol = self.connection_type.lower()
            url = f"{protocol}://{self.ip_address}:{self.port}/api/device/logs"
            params = {}
            if start_time:
                params["since"] = start_time.isoformat()
            res = httpx.get(url, params=params, timeout=5.0)
            if res.status_code != 200:
                return []
                
            data = res.json()
            events = data.get("logs", [])
            logs = []
            for event in events:
                user_id = event.get("userId")
                time_str = event.get("timestamp")
                if not user_id or not time_str:
                    continue
                try:
                    timestamp = datetime.fromisoformat(time_str.split("+")[0])
                except Exception:
                    timestamp = datetime.utcnow()
                    
                if start_time and timestamp <= start_time:
                    continue
                    
                logs.append({
                    "device_user_id": str(user_id),
                    "timestamp": timestamp,
                    "punch_type": str(event.get("punchType", "0")),
                    "verify_mode": str(event.get("verifyMode", "1")),
                    "work_code": "0",
                    "raw_payload": event
                })
            return logs
        except Exception as e:
            logger.error(f"Failed to get Generic logs: {e}")
            return []
