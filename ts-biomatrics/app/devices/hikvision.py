import random
from datetime import datetime, timedelta
import httpx
from typing import List, Dict, Any, Tuple, Optional
from app.devices.base import BaseDeviceAdapter
from app.core.logger import get_logger
from app.core.config import ALLOW_MOCK_MODE

logger = get_logger("Device Connection")

class HikvisionAdapter(BaseDeviceAdapter):
    """
    Hikvision biometric device adapter.
    Uses ISAPI HTTP/HTTPS endpoints with Digest Auth.
    Falls back to mock mode if connection fails.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = None
        self._is_mock = False
        self.protocol = "https" if self.port == 443 else "http"
        self.base_url = f"{self.protocol}://{self.ip_address}:{self.port}"

    def connect(self) -> bool:
        if "mock" in self.ip_address.lower() or self.ip_address == "127.0.0.1":
            if not ALLOW_MOCK_MODE:
                logger.error("Mock device address detected, but Mock Mode is disabled in production settings.")
                return False
            self._is_mock = True
            self.is_connected = True
            logger.info(f"Connected to Hikvision device '{self.name}' [MOCK MODE]")
            return True
            
        # Verify physical connectivity on local network first
        if not self.is_physically_online():
            logger.warning(f"Hikvision device '{self.name}' at {self.ip_address}:{self.port} is physically offline.")
            return False
            
        try:
            # We initialize the httpx client with digest authentication
            auth = httpx.DigestAuth(self.username or "admin", self.password or "")
            self.client = httpx.Client(auth=auth, verify=False, timeout=10.0)
            
            # Simple probe
            res = self.client.get(f"{self.base_url}/ISAPI/System/deviceInfo")
            if res.status_code == 200:
                self.is_connected = True
                logger.info(f"Connected to Hikvision device '{self.name}' at {self.ip_address}:{self.port}")
                return True
            else:
                raise Exception(f"HTTP Status {res.status_code}")
        except Exception as e:
            if ALLOW_MOCK_MODE:
                logger.warning(f"Failed to connect to real Hikvision device at {self.ip_address}:{self.port}: {e}. Falling back to MOCK MODE.")
                self._is_mock = True
                self.is_connected = True
                return True
            else:
                logger.error(f"Failed to connect to real Hikvision device at {self.ip_address}:{self.port}: {e}")
                return False

    def disconnect(self) -> None:
        if self.client:
            try:
                self.client.close()
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
            auth = httpx.DigestAuth(self.username or "admin", self.password or "")
            with httpx.Client(auth=auth, verify=False, timeout=5.0) as client:
                res = client.get(f"{self.base_url}/ISAPI/System/deviceInfo")
                if res.status_code == 200:
                    return True, None
                return False, f"HTTP Error {res.status_code}: {res.reason_phrase}"
        except Exception as e:
            if ALLOW_MOCK_MODE:
                logger.warning(f"Connection test failed for Hikvision at {self.ip_address}:{self.port}: {e}. Mocking success since host is reachable.")
                return True, None
            else:
                logger.error(f"Connection test failed for Hikvision device: {e}")
                return False, str(e)

    def get_device_info(self) -> Dict[str, Any]:
        if self._is_mock:
            return {
                "manufacturer": "Hikvision (Mock)",
                "model": "DS-K1T341-Mock",
                "serial_number": f"HK-MOCK-{self.device_id}",
                "firmware_version": "V3.2.30_build210517",
                "platform": "Hikvision Access Control",
                "device_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "user_count": 8,
                "fingerprint_count": 0,
                "face_count": 8,
                "card_count": 12,
                "attendance_log_count": 150,
                "connection_status": "ONLINE"
            }
            
        try:
            res = self.client.get(f"{self.base_url}/ISAPI/System/deviceInfo")
            # Usually returns XML. We can try to parse or extract key fields
            xml_text = res.text
            # Simple tag extractors
            def get_xml_tag(tag, text):
                import re
                m = re.search(f"<{tag}>(.*?)</{tag}>", text)
                return m.group(1) if m else ""
                
            model = get_xml_tag("model", xml_text)
            serial = get_xml_tag("serialNumber", xml_text)
            firmware = get_xml_tag("firmwareVersion", xml_text)
            
            return {
                "manufacturer": "Hikvision",
                "model": model or "DS-K1T",
                "serial_number": serial or f"HK-{self.device_id}",
                "firmware_version": firmware or "Unknown",
                "platform": "ISAPI Protocol",
                "device_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "user_count": 0,
                "fingerprint_count": 0,
                "face_count": 0,
                "card_count": 0,
                "attendance_log_count": 0,
                "connection_status": "ONLINE"
            }
        except Exception as e:
            logger.error(f"Failed to fetch Hikvision device info: {e}")
            return {"error": str(e), "connection_status": "OFFLINE"}

    def get_users(self) -> List[str]:
        if self._is_mock:
            return ["5001", "5002", "5003"]
            
        try:
            # Query /ISAPI/AccessControl/UserInfo/Search
            payload = {
                "UserInfoSearchCond": {
                    "searchID": f"py-get-users-{int(datetime.utcnow().timestamp())}",
                    "searchResultPosition": 0,
                    "maxResults": 1000
                }
            }
            res = self.client.post(f"{self.base_url}/ISAPI/AccessControl/UserInfo/Search?format=json", json=payload)
            if res.status_code == 200:
                data = res.json()
                users_list = data.get("UserInfoSearch", {}).get("UserInfo", [])
                return [str(u["employeeNo"]) for u in users_list if "employeeNo" in u]
            return []
        except Exception as e:
            logger.error(f"Failed to get Hikvision users: {e}")
            return []

    def get_attendance_logs(self, start_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        if self._is_mock:
            logs = []
            now = datetime.utcnow()
            for i in range(3):
                user_id = str(random.choice(["5001", "5002", "5003"]))
                log_time = now - timedelta(minutes=random.randint(1, 120))
                if start_time and log_time <= start_time:
                    continue
                logs.append({
                    "device_user_id": user_id,
                    "timestamp": log_time,
                    "punch_type": "0",
                    "verify_mode": "15", # e.g. face
                    "work_code": "0",
                    "raw_payload": {"device_id": self.device_id, "mock": True, "time": log_time.isoformat()}
                })
            return logs
            
        try:
            # Search parameters
            start_str = start_time.isoformat() if start_time else (datetime.utcnow() - timedelta(days=1)).isoformat()
            end_str = datetime.utcnow().isoformat()
            
            payload = {
                "AcsEventCond": {
                    "searchID": f"py-get-logs-{int(datetime.utcnow().timestamp())}",
                    "searchResultPosition": 0,
                    "maxResults": 1000,
                    "major": 5,
                    "minor": 75, # Legal Card Pass event
                    "startTime": start_str,
                    "endTime": end_str
                }
            }
            
            res = self.client.post(f"{self.base_url}/ISAPI/AccessControl/AcsEvent?format=json", json=payload)
            if res.status_code != 200:
                return []
                
            data = res.json()
            events = data.get("AcsEvent", {}).get("InfoList", [])
            logs = []
            for event in events:
                emp_no = event.get("employeeNoString") or event.get("employeeNo")
                if not emp_no:
                    continue
                time_str = event.get("time")
                # Time is usually like "2023-01-01T09:00:00"
                try:
                    timestamp = datetime.fromisoformat(time_str.split("+")[0])
                except Exception:
                    timestamp = datetime.utcnow()
                    
                if start_time and timestamp <= start_time:
                    continue
                    
                logs.append({
                    "device_user_id": str(emp_no),
                    "timestamp": timestamp,
                    "punch_type": "0",
                    "verify_mode": str(event.get("currentVerifyMode", "1")),
                    "work_code": "0",
                    "raw_payload": event
                })
            return logs
        except Exception as e:
            logger.error(f"Failed to get Hikvision attendance logs: {e}")
            return []
