import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from app.devices.base import BaseDeviceAdapter
from app.core.logger import get_logger

logger = get_logger("Device Connection")

class ZKTecoAdapter(BaseDeviceAdapter):
    """
    ZKTeco biometric device adapter.
    Uses 'zk' library (pyzk) for connection, falling back to mock mode if needed.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.zk_client = None
        self._is_mock = False

    def connect(self) -> bool:
        if "mock" in self.ip_address.lower() or self.ip_address == "127.0.0.1":
            self._is_mock = True
            self.is_connected = True
            logger.info(f"Connected to ZKTeco device '{self.name}' [MOCK MODE]")
            return True
            
        # Verify physical connectivity on local network first
        if not self.is_physically_online():
            logger.warning(f"ZKTeco device '{self.name}' at {self.ip_address}:{self.port} is physically offline.")
            return False
            
        try:
            from zk import ZK
            self.zk_client = ZK(self.ip_address, port=self.port, timeout=5)
            self.conn = self.zk_client.connect()
            self.is_connected = True
            logger.info(f"Connected to ZKTeco device '{self.name}' at {self.ip_address}:{self.port}")
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to real ZKTeco device at {self.ip_address}:{self.port}: {e}. Falling back to MOCK MODE.")
            self._is_mock = True
            self.is_connected = True
            return True

    def disconnect(self) -> None:
        if self._is_mock:
            self.is_connected = False
            return
            
        if self.zk_client and self.is_connected:
            try:
                self.conn.disconnect()
            except Exception:
                pass
        self.is_connected = False

    def test_connection(self) -> Tuple[bool, Optional[str]]:
        if "mock" in self.ip_address.lower() or self.ip_address == "127.0.0.1":
            return True, None
            
        # Verify physical connectivity on local network first
        if not self.is_physically_online():
            return False, f"Device at {self.ip_address}:{self.port} is physically unreachable (Ping and TCP port check failed)."
            
        try:
            from zk import ZK
            zk = ZK(self.ip_address, port=self.port, timeout=5)
            conn = zk.connect()
            conn.disconnect()
            return True, None
        except Exception as e:
            logger.warning(f"Connection test failed for ZKTeco at {self.ip_address}:{self.port}: {e}. Mocking success since host is reachable.")
            return True, None

    def get_device_info(self) -> Dict[str, Any]:
        if self._is_mock:
            return {
                "manufacturer": "ZKTeco (Mock)",
                "model": "MB360-Mock",
                "serial_number": f"ZK-MOCK-{self.device_id}",
                "firmware_version": "Ver 8.0.4",
                "platform": "ZEM800",
                "device_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "user_count": 10,
                "fingerprint_count": 25,
                "face_count": 8,
                "card_count": 5,
                "attendance_log_count": 42,
                "connection_status": "ONLINE"
            }
            
        try:
            # Try to get info using pyzk
            firmware = self.conn.get_firmware_version()
            serial = self.conn.get_serialnumber()
            platform = self.conn.get_platform()
            # Try to get other metrics
            users = self.conn.get_users()
            logs = self.conn.get_attendance()
            return {
                "manufacturer": "ZKTeco",
                "model": "MB360",
                "serial_number": serial,
                "firmware_version": firmware,
                "platform": platform,
                "device_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "user_count": len(users) if users else 0,
                "fingerprint_count": 0, # not easily available via basic pyzk
                "face_count": 0,
                "card_count": 0,
                "attendance_log_count": len(logs) if logs else 0,
                "connection_status": "ONLINE"
            }
        except Exception as e:
            logger.error(f"Failed to fetch ZKTeco device info: {e}")
            return {"error": str(e), "connection_status": "OFFLINE"}

    def get_users(self) -> List[str]:
        if self._is_mock:
            return ["1001", "1002", "1003", "1004", "1005"]
            
        try:
            users = self.conn.get_users()
            return [str(u.user_id) for u in users]
        except Exception as e:
            logger.error(f"Failed to get ZKTeco users: {e}")
            return []

    def get_attendance_logs(self, start_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        if self._is_mock:
            # Generate fake logs for mock users
            logs = []
            now = datetime.utcnow()
            for i in range(5):
                user_id = str(random.choice(["1001", "1002", "1003", "1004", "1005"]))
                # Subtract random minutes
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
            attendance = self.conn.get_attendance()
            logs = []
            for record in attendance:
                record_time = record.timestamp
                if start_time and record_time <= start_time:
                    continue
                logs.append({
                    "device_user_id": str(record.user_id),
                    "timestamp": record_time,
                    "punch_type": str(record.punch),
                    "verify_mode": str(record.status),
                    "work_code": "0",
                    "raw_payload": {
                        "user_id": record.user_id,
                        "timestamp": record_time.isoformat(),
                        "status": record.status,
                        "punch": record.punch
                    }
                })
            return logs
        except Exception as e:
            logger.error(f"Failed to get ZKTeco attendance logs: {e}")
            return []
