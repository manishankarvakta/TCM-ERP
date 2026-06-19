async function run() {
  const rows = [
    { PIN: "1001", Time: "2026-06-19 08:30:22", DeviceID: "1", Status: "0", Verified: "1", WorkCode: "0" },
    { PIN: "1002", Time: "2026-06-19 08:32:05", DeviceID: "1", Status: "0", Verified: "1", WorkCode: "0" },
    { PIN: "1003", Time: "2026-06-19 08:45:11", DeviceID: "1", Status: "0", Verified: "15", WorkCode: "0" },
    { PIN: "1001", Time: "2026-06-19 12:02:44", DeviceID: "1", Status: "2", Verified: "1", WorkCode: "0" },
    { PIN: "1001", Time: "2026-06-19 13:01:15", DeviceID: "1", Status: "3", Verified: "1", WorkCode: "0" },
    { PIN: "1002", Time: "2026-06-19 17:01:50", DeviceID: "1", Status: "1", Verified: "1", WorkCode: "0" },
    { PIN: "1003", Time: "2026-06-19 17:05:12", DeviceID: "1", Status: "1", Verified: "15", WorkCode: "0" },
    { PIN: "1001", Time: "2026-06-19 17:30:03", DeviceID: "1", Status: "1", Verified: "1", WorkCode: "0" }
  ];

  const payload = {
    deviceId: "cmqgffby80000ckkkjlbmh342",
    rows
  };

  const res = await fetch("http://localhost:3000/api/hr/biometric/csv-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Response:", data);
}
run();
