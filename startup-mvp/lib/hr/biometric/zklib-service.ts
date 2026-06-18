// @ts-ignore
import ZKLib from "node-zklib";

export async function pullLogsFromDevice(ip: string, port: number = 4370) {
  console.log(`🔌 Attempting to connect to ZKTeco device at ${ip}:${port}...`);
  // Initialize with timeout 10000ms
  const zkInstance = new ZKLib(ip, port, 10000, 4000); 

  try {
    // Connect to device
    await zkInstance.createSocket();
    console.log(`✅ Connected to ${ip}`);

    // Fetch attendances
    const logs = await zkInstance.getAttendances();
    console.log(`📥 Downloaded ${logs?.data?.length || 0} logs from ${ip}`);

    // Optionally fetch users to get their user IDs mapping
    // const users = await zkInstance.getUsers();

    await zkInstance.disconnect();

    if (!logs || !logs.data) {
      return { success: true, logs: [] };
    }

    // Map `node-zklib` output to our expected rawData format
    const formattedData = logs.data.map((log: any) => {
      // zklib returns: { deviceUserId: '1', recordTime: '2023-01-01 09:00:00' }
      // We need: { EnrollNumber, Date, Time }
      const recordDate = new Date(log.recordTime);
      return {
        EnrollNumber: log.deviceUserId,
        Date: recordDate.toISOString().split("T")[0],
        Time: recordDate.toTimeString().split(" ")[0],
      };
    });

    return { success: true, logs: formattedData };
  } catch (error: any) {
    console.error(`❌ Failed to connect or pull from ${ip}:`, error.message);
    try {
      await zkInstance.disconnect();
    } catch (e) {}
    
    return { success: false, error: error.message || "Failed to connect to device" };
  }
}
