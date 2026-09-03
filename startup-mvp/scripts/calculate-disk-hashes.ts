import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const migrationDirs = [
  "20260829010000_phase19_change_requests_commercial_scope_control",
  "20260829020000_phase19a_canonical_commercial_authority_hardening",
  "20260829030000_phase19b_notification_idempotency",
  "20260829040000_phase20_ceo_command_center"
];

const migrationsPath = path.join(__dirname, "../prisma/migrations");

console.log("=== DISK HASHES ===");
for (const dir of migrationDirs) {
  const filePath = path.join(migrationsPath, dir, "migration.sql");
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath); // Raw buffer
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    console.log(`Path:      ${filePath}`);
    console.log(`Size:      ${content.length} bytes`);
    console.log(`SHA256:    ${hash}`);
    console.log("------------------------");
  } else {
    console.log(`Path:      ${filePath} (NOT FOUND)`);
    console.log("------------------------");
  }
}
