import { PrismaClient, MilestoneStatus, IssueStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projectId = 'cmpfmx5qn0005op01m9did2g1';
  
  // Verify project exists
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    console.error('Project not found!');
    return;
  }

  const userId = 'cmltca6we003on101dexoqfjb'; // Aronno

  // Create Task Dependencies using the correct fields
  // Wait, I will just run a quick lookup for task 1 and 2 and create the dependency
  const task1 = await prisma.task.findFirst({ where: { title: 'Provision RDS', projectId } });
  const task2 = await prisma.task.findFirst({ where: { title: 'Configure VPC', projectId } });

  if (task1 && task2) {
    await prisma.taskDependency.create({
      data: {
        blockingTaskId: task1.id,
        dependentTaskId: task2.id,
      }
    });
    console.log('Successfully created task dependency');
  }

  console.log('Successfully seeded timeline data for project:', projectId);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
