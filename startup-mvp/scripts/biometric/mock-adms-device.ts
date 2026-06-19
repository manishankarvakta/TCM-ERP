import { parseArgs } from "util";

const MOCK_DEVICE = {
  name: "FF Office",
  serialNumber: "UEED252100146",
  model: "ZKTeco MB360",
  vendor: "ZKTeco",
  mode: "ADMS",
  localIp: "192.168.0.101",
  port: 4370,
};

const args = process.argv.slice(2);
const params: Record<string, string> = {};
args.forEach((arg) => {
  if (arg.startsWith("--")) {
    const parts = arg.substring(2).split("=");
    const key = parts[0];
    const value = parts.slice(1).join("=");
    params[key] = value !== undefined && value !== "" ? value : "";
  }
});

const server = params.server || "http://localhost:3000";
const sn = params.sn || MOCK_DEVICE.serialNumber;
const mode = params.mode || "full";

const dangerousKeywords = ["DELETE", "CLEAR", "REBOOT", "FACTORY RESET"];

const testSummary = {
  heartbeat: { getrequest: "N/A", cdata: "N/A", onlineExpected: false },
  attlog: { sent: 0, response: "N/A", duplicateTest: "N/A" },
  command: { received: "no", id: "", payload: "", ackSent: "no", finalStatus: "N/A", blocked: false },
  result: "PENDING"
};

async function fetchAdms(path: string, options: RequestInit = {}) {
  const url = `${server}${path}`;
  const defaultHeaders = {
    "User-Agent": "iClock Proxy/1.09",
    "Accept": "*/*",
  };
  options.headers = { ...defaultHeaders, ...options.headers };
  const res = await fetch(url, options);
  const text = await res.text();
  return { status: res.status, text };
}

async function runHeartbeat() {
  console.log("\n--- Running Heartbeat Test ---");
  try {
    const res1 = await fetchAdms(`/iclock/getrequest?SN=${sn}`);
    testSummary.heartbeat.getrequest = res1.text.trim() === "OK" || res1.text.startsWith("C:") ? "OK" : "FAILED";
    
    const res2 = await fetchAdms(`/iclock/cdata?SN=${sn}`);
    testSummary.heartbeat.cdata = res2.text.trim() === "OK" ? "OK" : "FAILED";
    
    testSummary.heartbeat.onlineExpected = true;
    console.log("Heartbeat success.");
  } catch (error: any) {
    console.error("Heartbeat failed:", error.message);
  }
}

async function runAttlog(isDuplicateTest = false) {
  console.log(`\n--- Running ATTLOG Test (Duplicate: ${isDuplicateTest}) ---`);
  const attlogData = `1001\t2026-06-19 08:30:22\t0\t1\t0\n1002\t2026-06-19 17:01:50\t1\t1\t0\n9999\t2026-06-19 17:30:03\t1\t1\t0`;
  try {
    const res = await fetchAdms(`/iclock/cdata?SN=${sn}&table=ATTLOG`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: attlogData,
    });
    
    if (!isDuplicateTest) {
      testSummary.attlog.sent = 3;
      testSummary.attlog.response = res.text.trim();
      console.log("ATTLOG sent. Response:", res.text.trim());
    } else {
      testSummary.attlog.duplicateTest = res.text.trim() === "OK" ? "passed" : "failed";
      console.log("Duplicate ATTLOG sent. Response:", res.text.trim());
    }
  } catch (error: any) {
    console.error("ATTLOG failed:", error.message);
  }
}

async function runCommandQueue() {
  console.log("\n--- Running Command Queue Test ---");
  try {
    const res = await fetchAdms(`/iclock/getrequest?SN=${sn}`);
    const text = res.text.trim();
    
    if (text === "OK") {
      console.log("No command available. Create a safe command first.");
      console.log("Hint: Go to Biometric Devices UI and trigger a manual sync or info query to queue a command.");
      return;
    }

    if (text.startsWith("C:")) {
      testSummary.command.received = "yes";
      
      // Expected format: C:123456789:DATA QUERY USERINFO
      const parts = text.split(":");
      const rawId = parts[1];
      const payload = parts.slice(2).join(":");
      
      testSummary.command.id = rawId;
      testSummary.command.payload = payload;
      console.log(`Received command ID: ${rawId}, Payload: ${payload}`);

      // Safety check
      const isDangerous = dangerousKeywords.some(k => payload.toUpperCase().includes(k));
      if (isDangerous) {
        console.log(`SAFETY WARNING: Refusing to ACK dangerous command: ${payload}`);
        testSummary.command.blocked = true;
        // ACK as FAILED
        await fetchAdms(`/iclock/devicecmd?SN=${sn}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `ID=${rawId}&Return=-1&CMD=${payload}`,
        });
        testSummary.command.finalStatus = "FAILED (SAFETY_BLOCK)";
        return;
      }

      console.log("Command is safe. Sending ACK...");
      const ackRes = await fetchAdms(`/iclock/devicecmd?SN=${sn}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `ID=${rawId}&Return=0&CMD=${payload}`,
      });
      
      if (ackRes.text.trim() === "OK") {
        testSummary.command.ackSent = "yes";
        testSummary.command.finalStatus = "ACKNOWLEDGED";
        console.log("ACK sent successfully.");
      } else {
        console.error("ACK failed:", ackRes.text);
      }
    }
  } catch (error: any) {
    console.error("Command Queue test failed:", error.message);
  }
}

async function printSummary() {
  let result = "PASSED";
  if (mode === "full" || mode === "heartbeat") {
    if (testSummary.heartbeat.getrequest !== "OK" || testSummary.heartbeat.cdata !== "OK") result = "FAILED";
  }
  if (mode === "full" || mode === "attlog") {
    if (testSummary.attlog.response !== "OK" || testSummary.attlog.duplicateTest === "failed") result = result === "PASSED" ? "PARTIAL" : "FAILED";
  }
  
  testSummary.result = result;

  console.log("\n==========================================");
  console.log("ADMS Mock Device Test Summary");
  console.log(`Server: ${server}`);
  console.log(`SN: ${sn}`);
  console.log("\nHeartbeat:");
  console.log(`- getrequest: ${testSummary.heartbeat.getrequest}`);
  console.log(`- cdata GET: ${testSummary.heartbeat.cdata}`);
  console.log(`- online status expected: ${testSummary.heartbeat.onlineExpected}`);
  
  console.log("\nATTLOG:");
  console.log(`- rows sent: ${testSummary.attlog.sent}`);
  console.log(`- response: ${testSummary.attlog.response}`);
  console.log(`- duplicate test: ${testSummary.attlog.duplicateTest}`);
  
  console.log("\nCommand Queue:");
  console.log(`- command received: ${testSummary.command.received}`);
  console.log(`- command id: ${testSummary.command.id}`);
  console.log(`- payload: ${testSummary.command.payload}`);
  console.log(`- ACK sent: ${testSummary.command.ackSent}`);
  console.log(`- final expected status: ${testSummary.command.finalStatus}`);
  
  console.log(`\nResult:\n${testSummary.result}`);
  console.log("==========================================\n");
}

async function main() {
  console.log(`Starting ADMS Mock Device... [Mode: ${mode}]`);

  if (mode === "heartbeat" || mode === "full") {
    await runHeartbeat();
  }
  
  if (mode === "attlog" || mode === "full") {
    await runAttlog(false);
  }

  if (mode === "command" || mode === "full") {
    await runCommandQueue();
  }

  if (mode === "full") {
    // Repeat ATTLOG for duplicate test
    await runAttlog(true);
  }

  await printSummary();
}

main();
