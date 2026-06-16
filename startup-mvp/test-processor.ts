import { PrismaClient } from '@prisma/client';
import { processNormalizedChunk } from './lib/hr/biometric/sync-service';

const prisma = new PrismaClient();

async function run() {
  console.log("--- Testing Unknown PIN Processing ---");
  await processNormalizedChunk({
    vendor: "ZKTeco",
    deviceId: undefined,
    rawData: [
      {
        EnrollNumber: "9999",
        Date: "2026-06-16",
        Time: "09:05:00",
        PunchType: "0",
        VerifyMode: "0",
        WorkCode: "0"
      }
    ]
  });
  
  const unmapped = await prisma.unmappedBiometricLog.findFirst({ where: { deviceUserId: '9999' }});
  console.log('Unmapped Log created:', !!unmapped);

  console.log("\n--- Testing Mapped PIN & Duplicate Prevention ---");
  const device = await prisma.biometricDevice.upsert({
    where: { serialNumber: 'TESTDEV1' },
    update: {},
    create: { name: 'Test', vendor: 'ZKTeco', serialNumber: 'TESTDEV1', createdBy: 'test' }
  });
  const emp = await prisma.employee.create({
    data: { name: 'Test Emp', employeeCode: `TEST999-${Date.now()}`, status: 'active' }
  });
  await prisma.employeeDeviceMap.create({
    data: { deviceId: device.id, deviceUserId: '1', employeeId: emp.id }
  });

  const payload = [
    {
      EnrollNumber: "1",
      Date: "2026-06-16",
      Time: "10:05:00",
      DeviceID: "TESTDEV1"
    }
  ];

  // First Run
  await processNormalizedChunk({ vendor: "ZKTeco", deviceId: device.id, rawData: payload });
  
  // Second Run (Duplicate)
  await processNormalizedChunk({ vendor: "ZKTeco", deviceId: device.id, rawData: payload });

  const logs = await prisma.attendanceLog.findMany({ where: { employeeId: emp.id }});
  console.log('Mapped Attendance Logs Count:', logs.length);
  if (logs.length === 1) console.log('Duplicate Prevention: SUCCESS');

}

run().catch(console.error).finally(() => process.exit(0));
