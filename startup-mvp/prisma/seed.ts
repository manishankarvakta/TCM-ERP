/**
 * Main seed file that orchestrates all seed operations
 * 
 * NOTE: Each seed file runs independently with its own PrismaClient instance.
 * To run all seeds in the correct dependency order, execute:
 * 
 *   npx tsx prisma/seed-users.ts && \
 *   npx tsx prisma/seed-units.ts && \
 *   npx tsx prisma/seed-categories.ts && \
 *   npx tsx prisma/seed-items-1.ts && \
 *   npx tsx prisma/seed-items-2.ts && \
 *   npx tsx prisma/seed-items-3.ts && \
 *   npx tsx prisma/seed-items-4.ts && \
 *   npx tsx prisma/seed-items-5.ts && \
 *   npx tsx prisma/seed-item-categories.ts && \
 *   npx tsx prisma/seed-module-groups.ts && \
 *   npx tsx prisma/seed-module-group-items-1.ts && \
 *   npx tsx prisma/seed-module-group-items-2.ts && \
 *   npx tsx prisma/seed-module-group-items-3.ts && \
 *   npx tsx prisma/seed-module-group-items-4.ts && \
 *   npx tsx prisma/seed-module-group-items-4.ts && \
 *   npx tsx prisma/seed-cover-letters.ts && \
 *   npx tsx prisma/seed-quotation-terms.ts
 * 
 * Or run individually: npx tsx prisma/seed-*.ts
 */

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🌱 Database Seeding Guide");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("\n📋 Execution Order (respects dependencies):");
console.log("   1. seed-users.ts (3 users + organization)");
console.log("   2. seed-units.ts (10 units, depends on users)");
console.log("   3. seed-categories.ts (3 categories)");
console.log("   4. seed-items-1.ts through seed-items-5.ts (depends on units)");
console.log("   5. seed-item-categories.ts (depends on items & categories)");
console.log("   6. seed-module-groups.ts (29 groups, depends on users)");
console.log("   7. seed-module-group-items-1.ts through seed-module-group-items-4.ts");
console.log("      (~145 items, depends on module groups)");
console.log("   8. seed-cover-letters.ts (Default templates with subjects)");
console.log("   9. seed-quotation-terms.ts (Default Terms of Service and Payment templates)");
console.log("\n   See SEED_README.md for more details.");
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
