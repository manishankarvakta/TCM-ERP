import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== TASKS AND SUBTASKS DETAIL ===");
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: "cm_project_techsoul_erp" },
      orderBy: { createdAt: "asc" }
    });
    
    console.log(`Loaded ${tasks.length} tasks/subtasks.`);
    
    tasks.forEach(t => {
      console.log(`Task: ${t.title} (${t.id})`);
      console.log(`  parentId: ${t.parentId}`);
      console.log(`  issueId: ${t.issueId}`);
      console.log(`  milestoneId: ${t.milestoneId}`);
      console.log(`  projectId: ${t.projectId}`);
    });
  } catch (error) {
    console.error("error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
