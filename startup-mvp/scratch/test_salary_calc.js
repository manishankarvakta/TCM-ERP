const { calculateSalaryBreakdown } = require('../lib/hr-payroll/policy-calculation');

console.log("=== TEST 1: Policy with 50/35/5/5/5 ===");
const res1 = calculateSalaryBreakdown({
  grossSalary: 18500,
  salaryStructurePolicy: {
    basicPercent: 50,
    houseRentPercent: 35,
    medicalPercent: 5,
    transportPercent: 5,
    foodPercent: 5
  }
});
console.log(res1);

console.log("\n=== TEST 2: Policy with 0% Food Allowance (50/40/5/5/0) ===");
const res2 = calculateSalaryBreakdown({
  grossSalary: 15000,
  salaryStructurePolicy: {
    basicPercent: 50,
    houseRentPercent: 40,
    medicalPercent: 5,
    transportPercent: 5,
    foodPercent: 0
  }
});
console.log(res2);

console.log("\n=== TEST 3: Fallback when no policy (55/26/5/4/10) ===");
const res3 = calculateSalaryBreakdown({
  grossSalary: 20000,
  salaryStructurePolicy: null
});
console.log(res3);
