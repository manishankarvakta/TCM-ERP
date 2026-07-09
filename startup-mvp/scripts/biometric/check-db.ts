import { prisma } from "../../lib/prisma";

async function main() {
  console.log("=== EmployeeDeviceMap Records ===");
  const maps = await prisma.employeeDeviceMap.findMany({
    include: {
      employee: { select: { name: true } },
      device: { select: { name: true, serialNumber: true } }
    }
  });

  console.log(`Total Mappings Found: ${maps.length}`);
  for (const m of maps) {
    console.log(`- ID: ${m.id}`);
    console.log(`  Employee: ${m.employee?.name} (ID: ${m.employeeId})`);
    console.log(`  Device: ${m.device?.name} (SN: ${m.device?.serialNumber})`);
    console.log(`  Device User ID (PIN): ${m.deviceUserId}`);
    console.log(`  Is Active: ${m.isActive}`);
    console.log("------------------------");
  }
}

main();
