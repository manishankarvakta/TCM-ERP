from typing import Optional
from app.devices.base import BaseDeviceAdapter
from app.devices.zkteco import ZKTecoAdapter
from app.devices.hikvision import HikvisionAdapter
from app.devices.generic import GenericDeviceAdapter

class DeviceManager:
    """
    Manager to instantiate appropriate device adapters based on configuration.
    """
    @staticmethod
    def get_adapter(
        device_id: int, 
        vendor: str, 
        name: str, 
        ip_address: str, 
        port: int, 
        username: Optional[str] = None, 
        password: Optional[str] = None
    ) -> BaseDeviceAdapter:
        """
        Returns a concrete instance of BaseDeviceAdapter.
        """
        vendor_clean = vendor.strip().lower()
        if "zkteco" in vendor_clean:
            return ZKTecoAdapter(
                device_id=device_id,
                name=name,
                ip_address=ip_address,
                port=port,
                username=username,
                password=password
            )
        elif "hikvision" in vendor_clean:
            return HikvisionAdapter(
                device_id=device_id,
                name=name,
                ip_address=ip_address,
                port=port,
                username=username,
                password=password
            )
        else:
            return GenericDeviceAdapter(
                device_id=device_id,
                name=name,
                ip_address=ip_address,
                port=port,
                username=username,
                password=password
            )
