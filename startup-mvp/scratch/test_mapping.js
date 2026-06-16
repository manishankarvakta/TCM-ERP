const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.employeeDeviceMap.deleteMany({ where: { employee: { email: { contains: '@emp.com' } } }});
  await prisma.employee.deleteMany({ where: { email: { contains: '@emp.com' } } });
  await prisma.biometricDevice.deleteMany({ where: { serialNumber: 'TEST-DEV-1' } });
  
  const admin = await prisma.user.findFirst();
  const emp1 = await prisma.employee.create({ data: { name: 'Test Emp 1', email: 'test1998@emp.com', status: 'active', employeeCode: 'EMP-TEST-998' } });
  const emp2 = await prisma.employee.create({ data: { name: 'Test Emp 2', email: 'test1999@emp.com', status: 'active', employeeCode: 'EMP-TEST-999' } });
  const device = await prisma.biometricDevice.create({ data: { name: 'Test Device', serialNumber: 'TEST-DEV-1', isActive: true, vendor: 'ZKTeco', createdBy: admin.id } });
  console.log('Created users & device');
  
  await prisma.employeeDeviceMap.create({ data: { employeeId: emp1.id, deviceId: device.id, deviceUserId: '1001', isActive: true } });
  console.log('Mapped emp1 to 1001 on device');
  
  try {
    await prisma.employeeDeviceMap.create({ data: { employeeId: emp2.id, deviceId: device.id, deviceUserId: '1001', isActive: true } });
    console.log('FAIL: Was able to map same PIN to emp2!');
  } catch (e) {
    console.log('PASS: Blocked mapping same PIN to emp2');
  }
  
  try {
    await prisma.employeeDeviceMap.create({ data: { employeeId: emp1.id, deviceId: device.id, deviceUserId: '1002', isActive: true } });
    console.log('FAIL: Was able to map same emp to same device twice!');
  } catch (e) {
    console.log('PASS: Blocked mapping same emp to same device twice');
  }
}
run().finally(() => prisma.$disconnect());
