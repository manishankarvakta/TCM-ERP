import { generatePayroll } from "../app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action";
import { validateHRMAccountingSetup } from "../lib/hr/payroll-settings-guard";

async function testGenerate() {
  console.log("🔍 Checking validateHRMAccountingSetup for PAYROLL_GENERATE...");
  const guard = await validateHRMAccountingSetup("PAYROLL_GENERATE");
  console.log("Guard Status:", JSON.stringify(guard, null, 2));

  console.log("\n🚀 Triggering generatePayroll(7, 2026) in test mode...");
  try {
    const res = await generatePayroll(7, 2026);
    console.log("Payroll Generation Result:", JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Payroll Generation crashed with error:", error);
  }
}

testGenerate();
