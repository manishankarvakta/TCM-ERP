import { PrismaClient, ProjectStatus, MilestoneStatus, IssueStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 RESET & SEEDING: Fresh Project Timeline");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // 1. Temporarily disable foreign key constraints (Postgres session_replication_role)
    console.log("🔄 Disabling foreign key constraints...");
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

    // 2. Perform clean purge of project-related tables
    console.log("🗑️  Purging old project-related tables...");
    
    const taskDeps = await prisma.taskDependency.deleteMany({});
    console.log(`   ✓ Deleted ${taskDeps.count} TaskDependency records`);

    const milestoneDeps = await prisma.milestoneDependency.deleteMany({});
    console.log(`   ✓ Deleted ${milestoneDeps.count} MilestoneDependency records`);

    const taskWatchers = await prisma.taskWatcher.deleteMany({});
    console.log(`   ✓ Deleted ${taskWatchers.count} TaskWatcher records`);

    const timesheets = await prisma.timesheet.deleteMany({});
    console.log(`   ✓ Deleted ${timesheets.count} Timesheet records`);

    const tasks = await prisma.task.deleteMany({});
    console.log(`   ✓ Deleted ${tasks.count} Task records`);

    const issues = await prisma.issue.deleteMany({});
    console.log(`   ✓ Deleted ${issues.count} Issue records`);

    const milestones = await prisma.milestone.deleteMany({});
    console.log(`   ✓ Deleted ${milestones.count} Milestone records`);

    const budgets = await prisma.projectBudget.deleteMany({});
    console.log(`   ✓ Deleted ${budgets.count} ProjectBudget records`);

    const notes = await prisma.note.deleteMany({
      where: { projectId: { not: null } }
    });
    console.log(`   ✓ Deleted ${notes.count} Project Note records`);

    const docs = await prisma.doc.deleteMany({
      where: { projectId: { not: null } }
    });
    console.log(`   ✓ Deleted ${docs.count} Project Doc records`);

    const projects = await prisma.project.deleteMany({});
    console.log(`   ✓ Deleted ${projects.count} Project records`);

    // 3. Re-enable foreign key constraints
    console.log("🔄 Re-enabling foreign key constraints...");
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    // 4. Fetch dynamic base records
    console.log("\n👤 Fetching active users...");
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    const aronnoUser = await prisma.user.findFirst({ where: { email: "aronnomujtabins@gmail.com" } });
    const hasibUser = await prisma.user.findFirst({ where: { email: "hasib@techsoulbd.com" } });
    const morshedUser = await prisma.user.findFirst({ where: { email: "morshedislam@techsoulbd.com" } });

    const defaultOwner = adminUser || await prisma.user.findFirst();
    if (!defaultOwner) {
      throw new Error("❌ No users found in the database. Please run seed-users.ts first.");
    }

    const USER_IDS = {
      ADMIN: adminUser?.id || defaultOwner.id,
      ARONNO: aronnoUser?.id || defaultOwner.id,
      HASIB: hasibUser?.id || defaultOwner.id,
      MORSHED: morshedUser?.id || defaultOwner.id,
    };

    console.log(`   ✓ User mapping established:`);
    console.log(`     • Admin: ${USER_IDS.ADMIN}`);
    console.log(`     • Aronno: ${USER_IDS.ARONNO}`);
    console.log(`     • Hasib: ${USER_IDS.HASIB}`);
    console.log(`     • Morshed: ${USER_IDS.MORSHED}`);

    console.log("\n🏢 Fetching client...");
    const client = await prisma.client.findFirst();
    if (!client) {
      throw new Error("❌ No clients found in the database. Please run seed-crm.ts first.");
    }
    console.log(`   ✓ Selected Client: "${client.name}" (ID: ${client.id})`);

    // 5. Create "TechSoul ERP Integration" Project
    console.log("\n🚀 Creating fresh Project: \"TechSoul ERP Integration\"...");
    const projectId = "cm_project_techsoul_erp";
    const project = await prisma.project.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: projectId,
        projectNumber: "PROJ-2026-0001",
        title: "TechSoul ERP Integration",
        description: "Enterprise integration of core CRM, financial ledger, and dynamic project workspace models.",
        status: ProjectStatus.ACTIVE,
        priority: "HIGH",
        startDate: new Date("2026-05-01T00:00:00Z"),
        endDate: new Date("2026-06-30T23:59:59Z"),
        budget: 75000.00,
        clientId: client.id,
        ownerId: USER_IDS.ADMIN,
        projectManagerId: USER_IDS.HASIB,
        createdAt: new Date("2026-05-01T08:00:00Z")
      }
    });
    console.log(`   ✓ Created Project: ${project.title} (${project.projectNumber})`);

    // 6. Seed Milestones
    console.log("\n🏔️ Seeding Milestones...");
    
    const milestone1Id = "cm_milestone_m1";
    await prisma.milestone.create({
      data: {
        id: milestone1Id,
        title: "Discovery & Architecture Blueprint",
        description: "System audits and database schema modeling.",
        status: MilestoneStatus.COMPLETED,
        dueDate: new Date("2026-05-10T23:59:59Z"),
        order: 1,
        projectId,
        createdAt: new Date("2026-05-01T09:00:00Z")
      }
    });

    const milestone2Id = "cm_milestone_m2";
    await prisma.milestone.create({
      data: {
        id: milestone2Id,
        title: "Interactive Gantt Frontend",
        description: "Visual and interactive timeline grid shading, zoom options, and resizing.",
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: new Date("2026-05-28T23:59:59Z"),
        order: 2,
        projectId,
        createdAt: new Date("2026-05-10T09:00:00Z")
      }
    });

    const milestone3Id = "cm_milestone_m3";
    await prisma.milestone.create({
      data: {
        id: milestone3Id,
        title: "Core Database & API Design",
        description: "Server Actions development, index optimizations, and sync engines.",
        status: MilestoneStatus.PLANNED,
        dueDate: new Date("2026-06-15T23:59:59Z"),
        order: 3,
        projectId,
        createdAt: new Date("2026-05-28T09:00:00Z")
      }
    });

    console.log(`   ✓ Seeded 3 Milestones`);

    // 7. Seed Issues
    console.log("\n🎯 Seeding Issues...");
    
    // Milestone 1 Issues
    const issue1Id = "cm_issue_i101";
    await prisma.issue.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: issue1Id,
        issueNumber: "TS-101",
        title: "System Specification Audit",
        description: "Conduct thorough audit of legacy schema models and migration boundaries.",
        status: IssueStatus.COMPLETED,
        priority: "HIGH",
        type: "TASK",
        milestoneId: milestone1Id,
        reporterId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.ARONNO,
        createdAt: new Date("2026-05-01T10:00:00Z")
      }
    });

    // Milestone 2 Issues
    const issue2Id = "cm_issue_i201";
    await prisma.issue.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: issue2Id,
        issueNumber: "TS-201",
        title: "Interactive Gantt Layout & Grid Shading",
        description: "Render weekend shaded columns, timeline grid headers, and red 'Today' indicator.",
        status: IssueStatus.IN_PROGRESS,
        priority: "CRITICAL",
        type: "TASK",
        milestoneId: milestone2Id,
        reporterId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.MORSHED,
        createdAt: new Date("2026-05-10T10:00:00Z")
      }
    });

    const issue3Id = "cm_issue_i202";
    await prisma.issue.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: issue3Id,
        issueNumber: "TS-202",
        title: "Gantt Interactions & Drag-and-Drop",
        description: "Build visual resize handles and coordinate drop calculations.",
        status: IssueStatus.IN_PROGRESS,
        priority: "HIGH",
        type: "TASK",
        milestoneId: milestone2Id,
        reporterId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.HASIB,
        createdAt: new Date("2026-05-12T10:00:00Z")
      }
    });

    // Milestone 3 Issues
    const issue4Id = "cm_issue_i301";
    await prisma.issue.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: issue4Id,
        issueNumber: "TS-301",
        title: "Database Migrations & Performance Engines",
        description: "Optimizations for large timeline node traversals.",
        status: IssueStatus.OPEN,
        priority: "HIGH",
        type: "TASK",
        milestoneId: milestone3Id,
        reporterId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.MORSHED,
        createdAt: new Date("2026-05-28T10:00:00Z")
      }
    });

    const issue5Id = "cm_issue_i302";
    await prisma.issue.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: issue5Id,
        issueNumber: "TS-302",
        title: "Milestone Single-day Visual Diamonds",
        description: "Create diamond markers on the timeline map for single-day review checks.",
        status: IssueStatus.OPEN,
        priority: "NORMAL",
        type: "TASK",
        milestoneId: milestone3Id,
        reporterId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.ARONNO,
        createdAt: new Date("2026-05-30T10:00:00Z")
      }
    });

    console.log(`   ✓ Seeded 5 Issues`);

    // 8. Seed Tasks & Subtasks
    console.log("\n📋 Seeding Tasks and Subtasks...");

    // Milestone 1 - TS-101 Tasks
    const task1Id = "cm_task_t101_1";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task1Id,
        title: "Audit existing database tables",
        description: "Check for active constraints on Project and Task schemas.",
        status: "COMPLETED",
        priority: "high",
        dueDate: new Date("2026-05-05T23:59:59Z"),
        projectId,
        milestoneId: milestone1Id,
        issueId: issue1Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.ARONNO,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-01T12:00:00Z")
      }
    });

    const task2Id = "cm_task_t101_2";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task2Id,
        title: "Document migration constraints",
        description: "Establish step-by-step guides for database wipe operations.",
        status: "COMPLETED",
        priority: "medium",
        dueDate: new Date("2026-05-10T23:59:59Z"),
        projectId,
        milestoneId: milestone1Id,
        issueId: issue1Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.ARONNO,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-05T12:00:00Z")
      }
    });

    // Milestone 2 - TS-201 Tasks (Gantt Layout)
    const task3Id = "cm_task_t201_1";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task3Id,
        title: "Render weekend shading across Gantt timeline",
        description: "Apply background styles to Sat-Sun columns in right-pane canvas.",
        status: "COMPLETED",
        priority: "high",
        dueDate: new Date("2026-05-15T23:59:59Z"),
        projectId,
        milestoneId: milestone2Id,
        issueId: issue2Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.MORSHED,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-10T12:00:00Z")
      }
    });

    const task4Id = "cm_task_t201_2";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task4Id,
        title: "Implement red vertical line for Today indicator",
        description: "Show visual marker pinning the current day relative to timeline dates.",
        status: "COMPLETED",
        priority: "medium",
        dueDate: new Date("2026-05-18T23:59:59Z"),
        projectId,
        milestoneId: milestone2Id,
        issueId: issue2Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.ARONNO,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-16T12:00:00Z")
      }
    });

    // Milestone 2 - TS-202 Tasks (Interactions)
    const task5Id = "cm_task_t202_1";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task5Id,
        title: "Build visual resize handles on Gantt bars",
        description: "Add mouse-drag visual cues to left and right edges.",
        status: "COMPLETED",
        priority: "high",
        dueDate: new Date("2026-05-22T23:59:59Z"),
        projectId,
        milestoneId: milestone2Id,
        issueId: issue3Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.HASIB,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-18T12:00:00Z")
      }
    });

    const task6Id = "cm_task_t202_2";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task6Id,
        title: "Implement horizontal drag-and-drop calculation engine",
        description: "Calculate pixel offsets relative to start Date and end Date.",
        status: "in-progress",
        priority: "urgent",
        dueDate: new Date("2026-05-25T23:59:59Z"),
        projectId,
        milestoneId: milestone2Id,
        issueId: issue3Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.HASIB,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-20T12:00:00Z")
      }
    });

    // SUBTASKS for task6Id
    const subtask1Id = "cm_subtask_t202_2_1";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: subtask1Id,
        title: "Compute dayWidth visual offsets",
        description: "Scale coordinate outputs to current column width.",
        status: "COMPLETED",
        priority: "medium",
        dueDate: new Date("2026-05-22T23:59:59Z"),
        projectId,
        milestoneId: milestone2Id,
        issueId: issue3Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.HASIB,
        parentId: task6Id,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-20T14:00:00Z")
      }
    });

    const subtask2Id = "cm_subtask_t202_2_2";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: subtask2Id,
        title: "Bound drag delta constraints",
        description: "Prevent sliding items outside project start and end dates.",
        status: "in-progress",
        priority: "medium",
        dueDate: new Date("2026-05-24T23:59:59Z"),
        projectId,
        milestoneId: milestone2Id,
        issueId: issue3Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.HASIB,
        parentId: task6Id,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-21T14:00:00Z")
      }
    });

    const task7Id = "cm_task_t202_3";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task7Id,
        title: "Connect Gantt resize/drag triggers to server actions",
        description: "Persist date offsets in backend schema records upon drag/resize releases.",
        status: "todo",
        priority: "high",
        dueDate: new Date("2026-05-28T23:59:59Z"),
        projectId,
        milestoneId: milestone2Id,
        issueId: issue3Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.HASIB,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-25T12:00:00Z")
      }
    });

    // Milestone 3 - TS-301 Tasks (DB & Performance)
    const task8Id = "cm_task_t301_1";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task8Id,
        title: "Design Prisma schema for task scheduling extensions",
        description: "Formulate indices and dependency fields inside schema file.",
        status: "todo",
        priority: "high",
        dueDate: new Date("2026-06-03T23:59:59Z"),
        projectId,
        milestoneId: milestone3Id,
        issueId: issue4Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.MORSHED,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-05-28T12:00:00Z")
      }
    });

    const task9Id = "cm_task_t301_2";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task9Id,
        title: "Profile index optimization for timeline queries",
        description: "Measure query execution latency before and after index deployments.",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-06-08T23:59:59Z"),
        projectId,
        milestoneId: milestone3Id,
        issueId: issue4Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.ADMIN,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-06-03T12:00:00Z")
      }
    });

    // Milestone 3 - TS-302 Tasks (Diamond single day)
    const task10Id = "cm_task_t302_1";
    await prisma.task.create({
// @ts-expect-error - Legacy compatibility
      data: {
        id: task10Id,
        title: "Milestone review meeting",
        description: "Crucial project review check-point. This single-day event renders as a visual diamond!",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-06-10T23:59:59Z"), // dueDate matches createdAt to force 1-day indicator
        projectId,
        milestoneId: milestone3Id,
        issueId: issue5Id,
        userId: USER_IDS.ADMIN,
        assigneeId: USER_IDS.ARONNO,
        entityType: "project",
        entityId: projectId,
        createdAt: new Date("2026-06-10T09:00:00Z")
      }
    });

    console.log(`   ✓ Seeded 10 Tasks and 2 Subtasks`);

    // 9. Seed Task Dependencies
    console.log("\n🔗 Seeding Task Dependencies...");
    
    // task7Id is blocked by task6Id
    await prisma.taskDependency.create({
      data: {
        blockingTaskId: task6Id,
        dependentTaskId: task7Id
      }
    });

    // task9Id is blocked by task8Id
    await prisma.taskDependency.create({
      data: {
        blockingTaskId: task8Id,
        dependentTaskId: task9Id
      }
    });

    console.log(`   ✓ Seeded 2 Task Dependencies`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Project Timeline seeded successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("\n❌ ERROR: Seeding project failed!");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
