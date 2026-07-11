from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

class BaseDeviceAdapter(ABC):
    """
    Abstract Base Class for all biometric device adapters.
    """
    def __init__(self, device_id: int, name: str, ip_address: str, port: int, 
                 username: Optional[str] = None, password: Optional[str] = None):
        self.device_id = device_id
        self.name = name
        self.ip_address = ip_address
        self.port = port
        self.username = username
        self.password = password
        self.is_connected = False

    @staticmethod
    def ping_host(ip: str, timeout: float = 1.0) -> bool:
        import subprocess
        import platform
        try:
            if platform.system().lower() == "windows":
                cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), ip]
            else:
                cmd = ["ping", "-c", "1", "-W", str(int(timeout)), ip]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout + 0.5)
            return res.returncode == 0
        except Exception:
            return False

    @staticmethod
    def check_tcp_port(ip: str, port: int, timeout: float = 1.0) -> bool:
        import socket
        try:
            with socket.create_connection((ip, port), timeout=timeout) as conn:
                return True
        except Exception:
            return False

    def is_physically_online(self) -> bool:
        """
        Checks if the device is reachable on the local network (via Ping or TCP Port check).
        Skip checks for mock/local addresses.
        """
        if "mock" in self.ip_address.lower() or self.ip_address == "127.0.0.1":
            return True
        
        # 1. Ping check
        ping_ok = self.ping_host(self.ip_address)
        if ping_ok:
            return True
            
        # 2. TCP Port check
        port_ok = self.check_tcp_port(self.ip_address, self.port)
        if port_ok:
            return True
            
        return False

    @abstractmethod
    def connect(self) -> bool:
        """
        Establishes a connection to the device.
        """
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """
        Closes the connection to the device.
        """
        pass

    @abstractmethod
    def test_connection(self) -> Tuple[bool, Optional[str]]:
        """
        Tests if the device is reachable and authentication works.
        Returns (success: bool, error_message: str | None).
        """
        pass

    @abstractmethod
    def get_device_info(self) -> Dict[str, Any]:
        """
        Retrieves device metadata (serial number, model, firmware, counts).
        """
        pass

    @abstractmethod
    def get_users(self) -> List[str]:
        """
        Retrieves list of registered User IDs/PINs from the device.
        """
        pass

    @abstractmethod
    def get_attendance_logs(self, start_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Retrieves attendance punch logs from the device.
        Each log dict should be normalized to:
        {
            "device_user_id": str,
            "timestamp": datetime,
            "punch_type": str,
            "verify_mode": str,
            "work_code": str,
            "raw_payload": dict
        }
        """
        pass
