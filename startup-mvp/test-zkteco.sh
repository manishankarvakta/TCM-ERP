#!/bin/bash
export PORT=3005
npm run dev -- -p $PORT > next.log 2>&1 &
NEXT_PID=$!

echo "Waiting for Next.js to start on port $PORT..."
sleep 15

# Push the DB just in case
npx prisma db push --accept-data-loss
npx tsx prisma/seed-permissions.ts

echo "--- 1. Testing GET Ping ---"
curl -s -X GET "http://localhost:$PORT/iclock/cdata?SN=TESTDEV1"

echo -e "\n--- 2. Testing POST Raw Push (Unknown PIN) ---"
curl -s -X POST "http://localhost:$PORT/iclock/cdata?SN=TESTDEV1&table=ATTLOG" \
-H "Content-Type: text/plain" \
-d "9999	2026-06-16 09:05:00	0	0	0"

sleep 3 # wait for background job to finish processing

echo -e "\n--- Checking DB for Unknown PIN ---"
npx prisma studio &
STUDIO_PID=$!
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const raw = await prisma.biometricRawLog.findFirst({ orderBy: { createdAt: 'desc' }});
  console.log('Latest RawLog:', raw?.rawData?.replace(/\n/g, '\\n'));
  const unmapped = await prisma.unmappedBiometricLog.findFirst({ where: { deviceUserId: '9999' }});
  console.log('Unmapped Log exists:', !!unmapped);
}
run().finally(() => process.exit(0));
"

echo -e "\n--- 3. Testing POST Raw Push (Mapped PIN & Duplicate) ---"
# Seed a fake employee and EmployeeDeviceMap
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const device = await prisma.biometricDevice.upsert({
    where: { serialNumber: 'TESTDEV1' },
    update: {},
    create: { name: 'Test', vendor: 'ZKTeco', serialNumber: 'TESTDEV1', createdBy: 'test' }
  });
  const emp = await prisma.employee.create({
    data: { name: 'Test Emp', employeeCode: 'TEST999', status: 'active' }
  });
  await prisma.employeeDeviceMap.create({
    data: { deviceId: device.id, deviceUserId: '1', employeeId: emp.id }
  });
  console.log('Seeded Map for DeviceUserId 1');
}
run().finally(() => process.exit(0));
"

# First Punch
curl -s -X POST "http://localhost:$PORT/iclock/cdata?SN=TESTDEV1&table=ATTLOG" \
-H "Content-Type: text/plain" \
-d "1	2026-06-16 10:05:00	0	0	0"

# Duplicate Punch
curl -s -X POST "http://localhost:$PORT/iclock/cdata?SN=TESTDEV1&table=ATTLOG" \
-H "Content-Type: text/plain" \
-d "1	2026-06-16 10:05:00	0	0	0"

sleep 3

echo -e "\n--- Checking DB for Mapped PIN & Deduplication ---"
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const emp = await prisma.employee.findUnique({ where: { employeeCode: 'TEST999' }});
  const logs = await prisma.attendanceLog.findMany({ where: { employeeId: emp.id }});
  console.log('Mapped Attendance Logs Count:', logs.length);
  if (logs.length === 1) console.log('Duplicate Prevention: SUCCESS');
}
run().finally(() => process.exit(0));
"

echo -e "\n--- 4. Testing Local Bridge ---"
curl -s -X POST "http://localhost:$PORT/api/biometric/sync" \
-H "Content-Type: application/json" \
-d '{"vendor":"ZKTeco","deviceId":"clxyz123456","rawData":[]}'
echo ""

kill $NEXT_PID
kill $STUDIO_PID 2>/dev/null
exit 0
