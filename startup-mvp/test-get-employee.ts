import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: 'cmqfw4ibi0003ckynr4mo0kuo' },
      select: {
        id: true,
        type: true,
        biometricDeviceId: true,
      }
    });
    console.log("Employee:", employee);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
