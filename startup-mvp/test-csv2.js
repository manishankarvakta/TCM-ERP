async function run() {
  const rows = [
    { PIN: "", Time: "2026-06-19 08:30:22", DeviceID: "1", Status: "0", Verified: "1", WorkCode: "0" },
    { PIN: "1002", Time: "", DeviceID: "1", Status: "0", Verified: "1", WorkCode: "0" }
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
