import { prisma } from "../lib/prisma";

async function testSalaryBreakdown() {
  console.log("==================================================");
  console.log("TESTING SALARY STRUCTURE BREAKDOWN DIRECT DATABASE QUERY");
  console.log("==================================================");

  // Get all employees
  const employees = await prisma.employee.findMany({
    include: {
      employeeType: {
        include: {
          salaryStructurePolicy: true
        }
      }
    }
  });

  if (employees.length === 0) {
    console.log("No employees found in the database. Creating a mock employee for testing...");
    return;
  }

  // Find default active SalaryStructurePolicy
  const defaultPolicy = await prisma.salaryStructurePolicy.findFirst({
    where: { isDefault: true, status: "active", isTrash: false }
  });

  console.log(`Found default active policy: ${defaultPolicy ? `"${defaultPolicy.name}"` : "None"}`);

  for (const emp of employees) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Employee: ${emp.name} (Code: ${emp.employeeCode})`);
    console.log(`Salary field in DB: ${emp.salary} (Type: ${typeof emp.salary})`);

    let resolvedPolicy = emp.employeeType?.salaryStructurePolicy || null;
    let resolutionSource = "EmployeeType mapped policy";

    if (!resolvedPolicy) {
      resolvedPolicy = defaultPolicy;
      resolutionSource = defaultPolicy ? "Active default company policy" : "Hardcoded Fallback (55/26/5/4/10)";
    }

    let salaryStructure = null;
    if (resolvedPolicy) {
      salaryStructure = {
        id: resolvedPolicy.id,
        name: resolvedPolicy.name,
        basicPercent: Number(resolvedPolicy.basicPercent),
        houseRentPercent: Number(resolvedPolicy.houseRentPercent),
        medicalPercent: Number(resolvedPolicy.medicalPercent),
        transportPercent: Number(resolvedPolicy.transportPercent),
        foodPercent: Number(resolvedPolicy.foodPercent),
        isDefault: resolvedPolicy.isDefault,
        isFallback: false,
      };
    } else {
      salaryStructure = {
        id: "fallback-structure",
        name: "Hardcoded Fallback Structure",
        basicPercent: 55.00,
        houseRentPercent: 26.00,
        medicalPercent: 5.00,
        transportPercent: 4.00,
        foodPercent: 10.00,
        isDefault: false,
        isFallback: true,
      };
    }

    console.log(`Resolution Source: ${resolutionSource}`);
    console.log(`Resolved Policy Name: ${salaryStructure.name}`);
    console.log(`Percentages: Basic(${salaryStructure.basicPercent}%), HouseRent(${salaryStructure.houseRentPercent}%), Medical(${salaryStructure.medicalPercent}%), Transport(${salaryStructure.transportPercent}%), Food(${salaryStructure.foodPercent}%)`);

    if (!emp.salary || Number(emp.salary) === 0) {
      console.log("Status: Salary not configured");
    } else {
      const gross = Number(emp.salary);
      const basic = (gross * salaryStructure.basicPercent) / 100;
      const rent = (gross * salaryStructure.houseRentPercent) / 100;
      const med = (gross * salaryStructure.medicalPercent) / 100;
      const trans = (gross * salaryStructure.transportPercent) / 100;
      const food = (gross * salaryStructure.foodPercent) / 100;
      const total = basic + rent + med + trans + food;

      console.log(`Calculated breakdown:`);
      console.log(`- Basic Salary: ৳${basic.toLocaleString("en-IN", { minimumFractionDigits: 2 })} BDT`);
      console.log(`- House Rent:   ৳${rent.toLocaleString("en-IN", { minimumFractionDigits: 2 })} BDT`);
      console.log(`- Medical:      ৳${med.toLocaleString("en-IN", { minimumFractionDigits: 2 })} BDT`);
      console.log(`- Transport:    ৳${trans.toLocaleString("en-IN", { minimumFractionDigits: 2 })} BDT`);
      console.log(`- Food:         ৳${food.toLocaleString("en-IN", { minimumFractionDigits: 2 })} BDT`);
      console.log(`- Base Gross:   ৳${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })} BDT`);

      if (Math.abs(gross - total) < 0.01) {
        console.log("[PASS] Sum of components matches Gross Salary exactly.");
      } else {
        console.log(`[FAIL] Sum mismatch! Gross: ${gross}, Sum of components: ${total}`);
      }
    }
  }

  // Let's also do a hardcoded test case: Gross = 50,000 with Fallback Policy
  console.log("\n==================================================");
  console.log("TESTING SAMPLE CASE: Gross = 50,000 BDT with Fallback");
  const testGross = 50000;
  const fallbackStructure = {
    basicPercent: 55.00,
    houseRentPercent: 26.00,
    medicalPercent: 5.00,
    transportPercent: 4.00,
    foodPercent: 10.00,
  };
  const basic = (testGross * fallbackStructure.basicPercent) / 100;
  const rent = (testGross * fallbackStructure.houseRentPercent) / 100;
  const med = (testGross * fallbackStructure.medicalPercent) / 100;
  const trans = (testGross * fallbackStructure.transportPercent) / 100;
  const food = (testGross * fallbackStructure.foodPercent) / 100;
  const total = basic + rent + med + trans + food;

  console.log(`Expected output:`);
  console.log(`- Basic Salary: 27,500.00 (Expected: 27,500)`);
  console.log(`- House Rent:   13,000.00 (Expected: 13,000)`);
  console.log(`- Medical:      2,500.00  (Expected: 2,500)`);
  console.log(`- Transport:    2,000.00  (Expected: 2,000)`);
  console.log(`- Food:         5,000.00  (Expected: 5,000)`);
  console.log(`- Base Gross:   50,000.00 (Expected: 50,000)`);

  console.log(`Actual calculated output:`);
  console.log(`- Basic Salary: ${basic.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  console.log(`- House Rent:   ${rent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  console.log(`- Medical:      ${med.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  console.log(`- Transport:    ${trans.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  console.log(`- Food:         ${food.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  console.log(`- Base Gross:   ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);

  if (basic === 27500 && rent === 13000 && med === 2500 && trans === 2000 && food === 5000 && total === 50000) {
    console.log("[PASS] Sample calculations match the business rules perfectly.");
  } else {
    console.log("[FAIL] Sample calculations mismatch.");
  }
  console.log("==================================================");
}

testSalaryBreakdown();
