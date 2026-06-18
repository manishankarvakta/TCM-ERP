import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let deviceId = '';
  let server = 'http://localhost:3000';
  let waitSeconds = 180;
  let safeOnly = true;
  let testCommand = '';

  for (const arg of args) {
    if (arg.startsWith('--deviceId=')) deviceId = arg.split('=')[1];
    if (arg.startsWith('--server=')) server = arg.split('=')[1];
    if (arg.startsWith('--waitSeconds=')) waitSeconds = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--safeOnly=')) safeOnly = arg.split('=')[1] === 'true';
    if (arg.startsWith('--testCommand=')) testCommand = arg.split('=')[1];
  }

  if (!deviceId) {
    console.error("Missing --deviceId argument");
    process.exit(1);
  }

  console.log(`Starting MB360 Discovery Report for device: ${deviceId}`);
  console.log(`Server: ${server}`);
  console.log(`Wait time: ${waitSeconds}s`);
  console.log(`Safe mode: ${safeOnly}`);

  // 1 & 2. Find device
  const device = await prisma.biometricDevice.findUnique({
    where: { id: deviceId },
    include: { warehouse: true }
  });

  if (!device || !device.serialNumber) {
    console.error("Device not found or missing serial number.");
    process.exit(1);
  }

  const isOnline = device.lastPingAt ? (new Date().getTime() - new Date(device.lastPingAt).getTime() < 5 * 60 * 1000) : false;

  console.log(`\n--- Device Found ---`);
  console.log(`Name: ${device.name}`);
  console.log(`SN: ${device.serialNumber}`);
  console.log(`IP/Port: ${device.ipAddress}:${device.port}`);
  console.log(`Mode: ${device.connectionMode}`);
  console.log(`Last Ping: ${device.lastPingAt}`);
  console.log(`Online: ${isOnline ? 'Yes' : 'No'}`);

  // 3. Test endpoint reachability
  console.log(`\n--- Testing Endpoints ---`);
  const endpointTests = [];
  
  const testGet = async (url: string) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      return { method: 'GET', url, status: res.status, response: text.substring(0, 100), error: null };
    } catch (e: any) {
      return { method: 'GET', url, status: 0, response: null, error: e.message };
    }
  };

  const testPost = async (url: string, body: string) => {
    try {
      const res = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const text = await res.text();
      return { method: 'POST', url, status: res.status, response: text.substring(0, 100), error: null };
    } catch (e: any) {
      return { method: 'POST', url, status: 0, response: null, error: e.message };
    }
  };


  const consumeQueuedCommand = args.includes("--consumeQueuedCommand=true");

  if (consumeQueuedCommand) {
    console.warn(`\n⚠️  WARNING: consumeQueuedCommand=true is set. This script WILL consume real queued commands from the database!`);
  }

  const getReqParams = consumeQueuedCommand ? `SN=${device.serialNumber}` : `SN=${device.serialNumber}&dryRun=true`;
  endpointTests.push(await testGet(`${server}/iclock/cdata?SN=${device.serialNumber}`));
  endpointTests.push(await testGet(`${server}/iclock/getrequest?${getReqParams}`));
  endpointTests.push(await testPost(`${server}/iclock/devicecmd?SN=${device.serialNumber}`, 'ID=TEST_SCRIPT&Return=0&CMD=TEST'));

  for (const t of endpointTests) {
    console.log(`${t.method} ${t.url} - Status: ${t.status} - Resp: ${t.response} - Err: ${t.error}`);
  }

  // 4. Collect database records before test
  const mappings = await prisma.employeeDeviceMap.findMany({
    where: { deviceId },
    include: { employee: true }
  });

  const rawLogs = await prisma.biometricRawLog.findMany({
    where: { deviceSerialNumber: device.serialNumber },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const attendanceLogs = await prisma.attendanceLog.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const unmappedLogs = await prisma.unmappedBiometricLog.findMany({
    where: { deviceSerialNumber: device.serialNumber },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const syncLogs = await prisma.biometricSyncLog.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const commandsBefore = await prisma.biometricCommand.findMany({
    where: { deviceSerialNumber: device.serialNumber },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  let testCmd = null;
  if (testCommand) {
    console.log(`\n--- Queuing Specific Test Command: ${testCommand} ---`);
    testCmd = await prisma.biometricCommand.create({
      data: {
        deviceSerialNumber: device.serialNumber,
        deviceId: device.id,
        commandType: 'TEST_COMMAND',
        commandText: testCommand,
        status: 'QUEUED',
      }
    });
    console.log(`Queued test command ID: ${testCmd.id}`);
  }

  // 6. Wait for device
  let finalCmdStatus = null;
  if (testCmd) {
    console.log(`\n--- Waiting up to ${waitSeconds}s for device response ---`);
    let waited = 0;
    while (waited < waitSeconds) {
      const check = await prisma.biometricCommand.findUnique({ where: { id: testCmd.id } });
      if (check && check.status !== 'QUEUED' && check.status !== 'SENT') {
        finalCmdStatus = check;
        console.log(`Command reached final status: ${check.status} at ${waited}s`);
        break;
      }
      await sleep(5000);
      waited += 5;
      process.stdout.write('.');
    }
    console.log();

    if (!finalCmdStatus) {
      finalCmdStatus = await prisma.biometricCommand.findUnique({ where: { id: testCmd.id } });
    }
  }

  // Reload records after wait
  const commandsAfter = await prisma.biometricCommand.findMany({
    where: { deviceSerialNumber: device.serialNumber },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  // Capability Matrix
  const hasAttendancePush = rawLogs.length > 0;
  const hasCommandPolling = commandsAfter.some(c => c.status !== 'QUEUED');
  const hasCommandResult = commandsAfter.some(c => c.status === 'ACKNOWLEDGED' || c.resultText !== null);
  const hasUnknownPunches = unmappedLogs.length > 0;

  const capabilityMatrix = [
    { cap: 'Device connected', evidence: isOnline, source: 'lastPingAt' },
    { cap: 'Attendance push', evidence: hasAttendancePush, source: 'BiometricRawLog' },
    { cap: 'Device command polling', evidence: hasCommandPolling, source: 'BiometricCommand' },
    { cap: 'Device command result', evidence: hasCommandResult, source: 'devicecmd resultText' },
    { cap: 'Unknown punch detection', evidence: hasUnknownPunches, source: 'UnmappedBiometricLog' }
  ];

  // Problems
  const problems = [];
  if (!isOnline) problems.push("Device appears offline or is not polling frequently enough.");
  if (!hasAttendancePush) problems.push("No attendance raw logs found. Device might not be pushing ATTLOG.");
  if (!hasCommandPolling) problems.push("Device is not polling getrequest for commands.");
  if (hasCommandPolling && !hasCommandResult) problems.push("Device pulled command but never posted result to devicecmd.");
  if (mappings.length === 0) problems.push("No mapped employees found for this device.");

  // JSON Report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(process.cwd(), 'reports', 'biometric');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const jsonReport = {
    metadata: { date: new Date(), server, deviceId, serialNumber: device.serialNumber, safeOnly },
    device,
    endpointTests,
    mappings,
    rawLogs,
    attendanceLogs,
    unmappedLogs,
    syncLogs,
    commandsBefore,
    commandsAfter,
    capabilityMatrix,
    problems
  };

  const jsonPath = path.join(reportDir, `mb360-discovery-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  // Markdown Report
  let md = `# MB360 Device Discovery & Raw Data Report\n\n`;
  md += `## 1. Test Metadata\n* Date: ${new Date().toISOString()}\n* Server: ${server}\n* Device ID: ${deviceId}\n* Serial: ${device.serialNumber}\n* Safe Mode: ${safeOnly}\n\n`;
  
  md += `## 2. Device Record\n* Name: ${device.name}\n* Serial: ${device.serialNumber}\n* Warehouse: ${device.warehouse?.name || 'N/A'}\n`;
  md += `* IP/Port: ${device.ipAddress}:${device.port}\n* Mode: ${device.connectionMode}\n* Last Ping: ${device.lastPingAt}\n* Online: ${isOnline ? 'Yes' : 'No'}\n\n`;

  md += `## 3. Endpoint Reachability\n| Endpoint | Method | Status | Response | Notes |\n| --- | --- | --- | --- | --- |\n`;
  for (const t of endpointTests) {
    const urlPath = new URL(t.url).pathname;
    md += `| ${urlPath} | ${t.method} | ${t.status} | \`${t.response || ''}\` | ${t.error || 'OK'} |\n`;
  }

  md += `\n## 4. Device Connection Status\nThe device appears ${isOnline ? 'ONLINE' : 'OFFLINE'} based on last ping. ${problems.includes("Device appears offline or is not polling frequently enough.") ? 'It is not actively communicating with the server.' : 'It is communicating.'}\n\n`;

  md += `## 5. Employee Device Mappings\n| Employee | Employee Code | Device PIN | Mapping Status |\n| --- | --- | --- | --- |\n`;
  if (mappings.length === 0) md += `| None | None | None | No mappings found |\n`;
  for (const m of mappings) {
    md += `| ${m.employee.name} | ${m.employee.employeeCode || ''} | ${m.deviceUserId} | ${m.isActive ? 'Active' : 'Inactive'} |\n`;
  }

  md += `\n## 6. Raw Data Received From Device\n`;
  md += `Found ${rawLogs.length} recent raw logs.\n`;
  for (const log of rawLogs.slice(0, 5)) {
    md += `- ID: ${log.id} | Time: ${log.createdAt} | Status: ${log.syncStatus}\n  Raw: \`${log.rawData.substring(0, 100)}...\`\n`;
  }

  md += `\n## 7. Data Sent To Device (Command Test)\n`;
  md += `- Test Command ID: ${testCmd?.id || 'None'}\n- Type: ${testCmd?.commandType || 'None'}\n- Status: ${finalCmdStatus?.status}\n- Result Text: ${finalCmdStatus?.resultText || 'None'}\n`;

  md += `\n## 8. Attendance Data\n`;
  md += `Found ${attendanceLogs.length} attendance logs strictly linked to this device.\n`;
  for (const log of attendanceLogs.slice(0, 5)) {
    md += `- Emp: ${log.employeeId} | Time: ${log.timestamp} | Source: ${log.source}\n`;
  }

  md += `\n## 9. Unknown Punches\n`;
  md += `Found ${unmappedLogs.length} unmapped punches.\n`;
  for (const log of unmappedLogs.slice(0, 5)) {
    md += `- PIN: ${log.deviceUserId} | Punch: ${log.punchTime} | Reason: ${log.reason}\n`;
  }

  md += `\n## 10. Sync / Command History\n`;
  md += `Found ${commandsAfter.length} total commands. Recent statuses:\n`;
  let stuckInSent = 0;
  for (const cmd of commandsAfter.slice(0, 5)) {
    if (cmd.status === 'SENT') stuckInSent++;
    const payloadInfo = cmd.payloadJson ? JSON.parse(cmd.payloadJson) : {};
    const admsCmdId = payloadInfo.admsCommandId || 'None';
    md += `- ID: ${cmd.id} | Type: ${cmd.commandType} | Status: ${cmd.status} | Responded: ${cmd.respondedAt}\n`;
    md += `  - ADMS Numeric ID: ${admsCmdId}\n`;
    md += `  - Sent Text (approx): C:${admsCmdId}:${cmd.commandText}\n`;
  }

  md += `\n## 11. Command Debug Details\n`;
  md += `- Commands Stuck in SENT: ${stuckInSent}\n`;
  md += `- Numeric ADMS Command ID Used: ${commandsAfter.some(c => c.payloadJson && JSON.parse(c.payloadJson).admsCommandId) ? 'Yes' : 'No'}\n`;
  
  md += `\n## 12. Raw Payload Samples\n`;
  md += `### CDATA:\n\`\`\`text\n${rawLogs[0]?.rawData || 'None'}\n\`\`\`\n`;
  md += `### DEVICECMD Result:\n\`\`\`text\n${commandsAfter.find(c => c.resultText)?.resultText || 'None'}\n\`\`\`\n`;

  md += `\n## 13. Capability Matrix\n| Capability | Evidence Found? | Source | Status | Notes |\n| --- | --- | --- | --- | --- |\n`;
  for (const cap of capabilityMatrix) {
    md += `| ${cap.cap} | ${cap.evidence ? 'Yes' : 'No'} | ${cap.source} | | |\n`;
  }

  md += `\n## 14. Problems Found\n`;
  if (problems.length === 0) md += `- None\n`;
  for (const p of problems) md += `- ${p}\n`;

  md += `\n## 15. Final Recommendation\n`;
  md += `* Attendance push working? ${hasAttendancePush ? 'Yes' : 'No'}\n`;
  md += `* Command sync working? ${hasCommandPolling && hasCommandResult ? 'Yes' : 'No'}\n`;
  md += `* ERP can send commands? ${hasCommandPolling ? 'Yes' : 'No'}\n`;
  md += `* Next steps: ${hasCommandResult ? 'Test specific MB360 syntax (like USERINFO)' : 'Debug devicecmd route or device network'}\n`;

  const mdPath = path.join(reportDir, `mb360-discovery-report-${timestamp}.md`);
  fs.writeFileSync(mdPath, md);

  console.log(`\nMB360 Discovery Report Completed\n`);
  console.log(`Device: ${device.name}`);
  console.log(`Serial: ${device.serialNumber}`);
  console.log(`Connected: ${isOnline ? 'Yes' : 'No'}`);
  console.log(`Attendance Push: ${hasAttendancePush ? 'Yes' : 'No'}`);
  console.log(`Command Polling: ${hasCommandPolling ? 'Yes' : 'No'}`);
  console.log(`Device Command Result: ${hasCommandResult ? 'Yes' : 'No'}`);
  console.log(`\nMarkdown Report:\n${mdPath}`);
  console.log(`\nJSON Report:\n${jsonPath}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
