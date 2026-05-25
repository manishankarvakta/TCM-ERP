import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DB QUERY START ===");
  const project = await prisma.project.findFirst({
    where: { id: "cm_project_techsoul_erp" }
  });
  console.log("Project:", project);

  const milestones = await prisma.milestone.findMany({
    where: { projectId: "cm_project_techsoul_erp" }
  });
  console.log("Milestones count:", milestones.length);
  milestones.forEach(m => console.log(`Milestone: id=${m.id}, title=${m.title}`));

  const milestoneIds = milestones.map(m => m.id);
  const issues = await prisma.issue.findMany({
    where: { milestoneId: { in: milestoneIds } }
  });
  console.log("Issues count:", issues.length);
  issues.forEach(i => console.log(`Issue: id=${i.id}, title=${i.title}, milestoneId=${i.milestoneId}`));

  const tasks = await prisma.task.findMany({
    where: { projectId: "cm_project_techsoul_erp" }
  });
  console.log("Tasks count:", tasks.length);
  tasks.forEach(t => console.log(`Task: id=${t.id}, title=${t.title}, parentId=${t.parentId}, issueId=${t.issueId}, milestoneId=${t.milestoneId}`));

  console.log("=== DB QUERY END ===");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
