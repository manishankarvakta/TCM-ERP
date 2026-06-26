import { prisma } from "../lib/prisma";
import { calculateSalaryBreakdown } from "../lib/hr-payroll/policy-calculation";

async function testPrintAllRoute() {
  console.log("==================================================");
  console.log("TESTING BULK PRINT ROUTE DATA RETRIEVAL");
  console.log("==================================================");

  const payroll = await prisma.payroll.findFirst();
  if (!payroll) {
    console.log("No payroll run found in database.");
    return;
  }

  const defaultPolicy = await prisma.salaryStructurePolicy.findFirst({
    where: { isDefault: true, status: "active", isTrash: false }
  });

  const fullPayroll = await prisma.payroll.findUnique({
    where: { id: payroll.id },
    include: {
      items: {
        include: {
          employee: {
            include: {
              employeeType: {
                include: {
                  salaryStructurePolicy: true
                }
              }
            }
          }
        },
        orderBy: { employee: { name: "asc" } }
      }
    }
  });

  if (!fullPayroll) {
    console.log("Payroll not found.");
    return;
  }

  console.log(`Loaded payroll: ${fullPayroll.payrollNumber}`);
  console.log(`Total items to print: ${fullPayroll.items.length}`);

  const resolvedItems = fullPayroll.items.map(item => {
    const basic = Number(item.basic);
    const houseRent = Number(item.houseRent);
    const medical = Number(item.medical);
    const transport = Number(item.transport);
    const foodAllowance = Number(item.foodAllowance);

    const isFlat = houseRent === 0 && medical === 0 && transport === 0 && foodAllowance === 0;

    let resBasic = basic;
    let resHouseRent = houseRent;
    let resMedical = medical;
    let resTransport = transport;
    let resFoodAllowance = foodAllowance;

    if (isFlat) {
      const gross = basic;
      const resolvedPolicy = item.employee?.employeeType?.salaryStructurePolicy || defaultPolicy || null;

      const breakdown = calculateSalaryBreakdown({
        grossSalary: gross,
        salaryStructurePolicy: resolvedPolicy
      });

      resBasic = breakdown.basicSalary;
      resHouseRent = breakdown.houseRent;
      resMedical = breakdown.medical;
      resTransport = breakdown.transport;
      resFoodAllowance = breakdown.food;
    }

    return {
      employeeName: item.employee.name,
      basic: resBasic,
      houseRent: resHouseRent,
      medical: resMedical,
      transport: resTransport,
      food: resFoodAllowance,
    };
  });

  console.log("Resolved items successfully:");
  resolvedItems.forEach((i, idx) => {
    console.log(`[${idx + 1}] ${i.employeeName} -> Basic: ${i.basic}, HouseRent: ${i.houseRent}, Medical: ${i.medical}, Transport: ${i.transport}, Food: ${i.food}`);
  });
  console.log("==================================================");
}

testPrintAllRoute();
