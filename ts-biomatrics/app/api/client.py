import httpx
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import APP_VERSION
from app.core.logger import get_logger

logger = get_logger("API")

class GatewayApiClient:
    """
    HTTP Client for secure gateway API communications with the cloud ERP.
    """
    def __init__(self, base_url: str, api_key: str, gateway_id: str, installation_id: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.gateway_id = gateway_id
        self.installation_id = installation_id
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "X-Gateway-ID": gateway_id or "",
            "X-Installation-ID": installation_id or "",
            "X-App-Version": APP_VERSION,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def _request(self, method: str, path: str, json_data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Tuple[bool, Optional[Dict[str, Any]], str]:
        """
        Generic private request runner.
        Returns (success: bool, response_dict: dict | None, error_message: str)
        """
        url = f"{self.base_url}{path}"
        
        # Omit gateway headers for config endpoint to avoid production server filtering issues
        headers = self.headers.copy()
        if path == "/api/biometric/gateway/config":
            headers.pop("X-Gateway-ID", None)
            headers.pop("X-Installation-ID", None)
            
        try:
            with httpx.Client(headers=headers, verify=False, timeout=15.0) as client:
                if method.upper() == "GET":
                    response = client.get(url, params=params)
                elif method.upper() == "POST":
                    response = client.post(url, json=json_data, params=params)
                else:
                    return False, None, f"Unsupported method: {method}"

                if response.status_code == 200:
                    try:
                        return True, response.json(), ""
                    except Exception:
                        return True, {"text": response.text}, ""
                elif response.status_code == 401:
                    return False, None, "Unauthorized: Invalid API Key"
                elif response.status_code == 403:
                    return False, None, "Forbidden: Access denied to biometric gateway APIs"
                else:
                    error_detail = response.text[:200] if response.text else response.reason_phrase
                    return False, None, f"Server responded with status {response.status_code}: {error_detail}"
        except httpx.RequestError as e:
            return False, None, f"Network connection failed: {str(e)}"

    def test_connection(self) -> Tuple[bool, str]:
        """
        Tests connection to the cloud ERP using the Config API.
        """
        # Config API is GET /api/biometric/gateway/config
        success, data, error = self._request("GET", "/api/biometric/gateway/config")
        if success:
            return True, "Connection Successful"
        return False, error

    def get_config(self) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Retrieves gateway configuration (e.g. configured devices).
        """
        success, data, error = self._request("GET", "/api/biometric/gateway/config")
        if success and data and "devices" in data:
            return True, data["devices"], ""
        return False, [], error or "Invalid configuration response"

    def send_heartbeat(self, status: str, pending_logs: int, failed_logs: int, active_devices: int) -> Tuple[bool, str]:
        """
        Sends gateway heartbeat status to the cloud.
        """
        payload = {
            "gatewayId": self.gateway_id,
            "status": status,
            "pendingLogs": pending_logs,
            "failedLogs": failed_logs,
            "activeDevices": active_devices
        }
        success, _, error = self._request("POST", "/api/biometric/gateway/heartbeat", json_data=payload)
        if success:
            return True, "Heartbeat Successful"
        return False, error

    def update_device_status(self, device_reports: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Sends device status checks to the cloud.
        Expects device_reports like:
        [ { "deviceId": "cloud_id", "reachable": True, "lastCheckedAt": "ISOString" } ]
        """
        payload = {
            "devices": device_reports
        }
        success, _, error = self._request("POST", "/api/biometric/gateway/device-status", json_data=payload)
        if success:
            return True, "Device status updated"
        return False, error

    def get_user_mappings(self) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Retrieves employee and biometric-device user mappings from the cloud application.
        """
        success, data, error = self._request("GET", "/api/biometric/gateway/user-mappings")
        if success and data and "mappings" in data:
            return True, data["mappings"], ""
        return False, [], error or "Invalid mappings response"

    def update_user_mappings(self, reports: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Reports mapping status or synchronization results to the cloud.
        Expects reports: [ { "deviceId": str, "deviceUserId": str, "status": "SYNCED" | "FAILED", "error": str | None } ]
        """
        payload = {
            "reports": reports
        }
        success, _, error = self._request("POST", "/api/biometric/gateway/user-mappings", json_data=payload)
        if success:
            return True, "User mappings status reports sent"
        return False, error

    def sync_biometric_logs(self, vendor: str, device_id: str, formatted_punches: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Sends biometric attendance logs to the cloud.
        Sends payload to POST /api/biometric/sync
        """
        payload = {
            "vendor": vendor,
            "deviceId": device_id,
            "gatewayId": self.gateway_id,
            "rawData": formatted_punches
        }
        success, data, error = self._request("POST", "/api/biometric/sync", json_data=payload)
        if success:
            if data and data.get("success"):
                return True, ""
            return False, data.get("error", "Server failed to process sync job")
        return False, error
