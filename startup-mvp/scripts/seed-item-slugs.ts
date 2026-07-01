import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")           // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "-")         // Replace multiple - with single -
    .replace(/^-+/, "")             // Trim - from start of text
    .replace(/-+$/, "");            // Trim - from end of text
}

async function main() {
  console.log("🚀 Starting Item Slugs Seeding Script...");
  
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`📋 Found ${items.length} total items in database.`);

  const slugs = new Set<string>();

  // First pass: register all existing non-empty slugs to prevent duplicates
  for (const item of items) {
    if (item.slug && item.slug.trim() !== "") {
      slugs.add(item.slug);
    }
  }

  let seededCount = 0;

  // Second pass: generate and assign unique slugs where missing
  for (const item of items) {
    if (!item.slug || item.slug.trim() === "") {
      const baseSlug = slugify(item.name) || "item";
      let slug = baseSlug;
      let counter = 1;
      while (slugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      slugs.add(slug);

      await prisma.item.update({
        where: { id: item.id },
        data: { slug },
      });
      console.log(`   ✅ Seeded item "${item.name}" (ID: ${item.id}) with slug "${slug}"`);
      seededCount++;
    } else {
      console.log(`   ⏭️ Skipping item "${item.name}" (already has slug "${item.slug}")`);
    }
  }

  console.log(`\n🎉 Slugs Seeding Completed! Seeded ${seededCount} items.`);
}

main()
  .catch((e) => {
    console.error("❌ Error running seeding script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
