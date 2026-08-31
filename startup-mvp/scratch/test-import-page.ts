import { getImportModulesAction } from "../app/(dashboard)/dashboard/import/_actions/import.action";
import { IMPORT_MODULES } from "../lib/import-config";

async function main() {
  console.log("Testing IMPORT_MODULES config length:", IMPORT_MODULES.length);
  try {
    const res = await getImportModulesAction();
    console.log("getImportModulesAction result:", res);
  } catch (err) {
    console.error("getImportModulesAction error:", err);
  }
}

main();
