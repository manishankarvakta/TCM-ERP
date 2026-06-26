import { prisma } from "../lib/prisma";
import { calculateSalaryBreakdown } from "../lib/hr-payroll/policy-calculation";

async function testPayrollBreakdown() {
  console.log("==================================================");
  console.log("TESTING DYNAMIC BREAKDOWN DIRECT DATABASE QUERY");
  console.log("==================================================");

  // Find a generated payroll
  const payroll = await prisma.payroll.findFirst();

  if (!payroll) {
    console.log("No payroll runs found in the database. Skipping test.");
    return;
  }

  console.log(`\nLoading payroll ID: ${payroll.id} (Number: ${payroll.payrollNumber})`);

  // Load default active SalaryStructurePolicy
  const defaultPolicy = await prisma.salaryStructurePolicy.findFirst({
    where: { isDefault: true, status: "active", isTrash: false }
  });

  const fullPayroll = await prisma.payroll.findUnique({
    where: { id: payroll.id },
    include: {
      creator: { select: { name: true } },
      approver: { select: { name: true } },
      items: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              designation: true,
              employeeType: {
                select: {
                  id: true,
                  name: true,
                  salaryStructurePolicy: {
                    select: {
                      id: true,
                      name: true,
                      basicPercent: true,
                      houseRentPercent: true,
                      medicalPercent: true,
                      transportPercent: true,
                      foodPercent: true,
                    }
                  }
                }
              }
            },
          },
        },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!fullPayroll) {
    console.log("Payroll not found.");
    return;
  }

  const items = fullPayroll.items.map(item => {
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
    let resolutionSource = "Saved in DB (already broken down)";

    if (isFlat) {
      const gross = basic;
      const resolvedPolicy = item.employee?.employeeType?.salaryStructurePolicy || defaultPolicy || null;
      resolutionSource = item.employee?.employeeType?.salaryStructurePolicy 
        ? "Dynamic EmployeeType mapped policy" 
        : defaultPolicy 
        ? "Dynamic active default policy" 
        : "Dynamic fallback (55/26/5/4/10)";

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
      name: item.employee.name,
      code: item.employee.employeeCode,
      rawBasic: basic,
      isFlat,
      resolutionSource,
      basic: resBasic,
      houseRent: resHouseRent,
      medical: resMedical,
      transport: resTransport,
      foodAllowance: resFoodAllowance,
    };
  });

  console.log(`Loaded ${items.length} items. Resolved Component Breakdown:`);
  for (const item of items) {
    console.log(`\nEmployee: ${item.name} (${item.code})`);
    console.log(`- Saved raw basic in DB: ${item.rawBasic}`);
    console.log(`- Was flat in DB? ${item.isFlat}`);
    console.log(`- Resolution Source: ${item.resolutionSource}`);
    console.log(`- Resolved breakdown: Basic(${item.basic}), HouseRent(${item.houseRent}), Medical(${item.medical}), Transport(${item.transport}), Food(${item.foodAllowance})`);
    
    const sum = item.basic + item.houseRent + item.medical + item.transport + item.foodAllowance;
    console.log(`- Base Gross Salary (sum): ৳${sum.toLocaleString("en-IN", { minimumFractionDigits: 2 })} BDT`);
    
    if (Math.abs(item.rawBasic - sum) < 0.05) {
      console.log("[PASS] Resolved breakdown sum matches the original raw salary perfectly.");
    } else {
      console.log(`[FAIL] Mismatch! Original: ${item.rawBasic}, Sum: ${sum}`);
    }
  }

  console.log("==================================================");
}

testPayrollBreakdown();
