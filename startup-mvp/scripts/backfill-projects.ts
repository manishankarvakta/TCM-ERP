import { prisma } from "../lib/prisma";
import { generateProjectNumber } from "../app/actions/projects/project.action";

async function main() {
  console.log("Starting direct Prisma project number backfill...");
  try {
    const projectsToBackfill = await prisma.project.findMany({
      where: { projectNumber: null },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${projectsToBackfill.length} projects to backfill.`);

    let count = 0;
    for (const project of projectsToBackfill) {
      const projectNumber = await generateProjectNumber();
      console.log(`Backfilling project ${project.id} ("${project.title}") with ${projectNumber}`);
      await prisma.project.update({
        where: { id: project.id },
        data: { projectNumber },
      });
      count++;
    }

    console.log(`Backfill completed successfully. Updated ${count} projects.`);
    process.exit(0);
  } catch (err) {
    console.error("Execution error:", err);
    process.exit(1);
  }
}

main();
