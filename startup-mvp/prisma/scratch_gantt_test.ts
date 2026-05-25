import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== GANTT TEST START ===");
  const projectId = "cm_project_techsoul_erp";

  // Simulate what getProjectGanttData does:
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { order: "asc" }
  });

  const milestoneIds = milestones.map(m => m.id);
  const issues = await prisma.issue.findMany({
    where: { milestoneId: { in: milestoneIds } },
    include: {
      Assignee: { select: { id: true, name: true, image: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      Assignee: { select: { id: true, name: true, image: true } },
      BlockedBy: { select: { blockingTaskId: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  console.log("Found milestones:", milestones.length);
  console.log("Found issues:", issues.length);
  console.log("Found tasks:", tasks.length);

  // Group tasks
  const subtaskMap: Record<string, typeof tasks> = {};
  const rootTasksByIssueId: Record<string, typeof tasks> = {};

  tasks.forEach(task => {
    if (task.parentId) {
      if (!subtaskMap[task.parentId]) subtaskMap[task.parentId] = [];
      subtaskMap[task.parentId].push(task);
    } else if (task.issueId) {
      if (!rootTasksByIssueId[task.issueId]) rootTasksByIssueId[task.issueId] = [];
      rootTasksByIssueId[task.issueId].push(task);
    }
  });

  console.log("Root tasks grouping count:", Object.keys(rootTasksByIssueId).length);
  Object.keys(rootTasksByIssueId).forEach(issueId => {
    console.log(`Issue ${issueId} has root tasks:`, rootTasksByIssueId[issueId].map(t => t.title));
  });

  console.log("Subtasks grouping count:", Object.keys(subtaskMap).length);
  Object.keys(subtaskMap).forEach(parentId => {
    console.log(`Parent task ${parentId} has subtasks:`, subtaskMap[parentId].map(st => st.title));
  });

  console.log("=== GANTT TEST END ===");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
