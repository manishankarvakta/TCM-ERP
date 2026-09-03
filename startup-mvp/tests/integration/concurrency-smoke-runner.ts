import { fork } from "child_process";
import path from "path";
import { prisma } from "../../lib/prisma";

const workerPath = path.join(__dirname, "concurrency-worker.ts");

function launchWorker(args: string[]): Promise<any> {
  return new Promise((resolve) => {
    // Launch worker via tsx
    const child = fork(path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), [workerPath, ...args], {
      stdio: "pipe",
    });
    
    let output = "";
    child.stdout?.on("data", (data) => {
      output += data.toString();
    });
    
    child.stderr?.on("data", (data) => {
      console.error("Worker stderr:", data.toString());
    });

    child.on("close", () => {
      try {
        resolve(JSON.parse(output.trim()));
      } catch {
        resolve({ error: "Failed to parse JSON", output });
      }
    });
  });
}

async function runSmokes() {
  console.log("============================================================");
  console.log("🔥 RUNNING FINAL MULTI-PROCESS CONCURRENCY SMOKE TESTS");
  console.log("============================================================\n");

  const orgId = "concurrency-test-org";
  
  // Clean up any stale items from previous runs first
  await prisma.approvalDecision.deleteMany({ where: { organizationId: orgId } });
  await prisma.approvalRequest.deleteMany({ where: { organizationId: orgId } });
  await prisma.changeRequest.deleteMany({ where: { organizationId: orgId } });
  await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
  await prisma.order.deleteMany({ where: { organizationId: orgId } });
  await prisma.queueJob.deleteMany({ where: { organizationId: orgId } });
  await prisma.notification.deleteMany({ where: { userId: "concurrency-test-user" } });
  await prisma.userLog.deleteMany({ where: { userId: "concurrency-test-user" } });
  await prisma.project.deleteMany({ where: { organizationId: orgId } });
  await prisma.client.deleteMany({ where: { organizationId: orgId } });
  await prisma.approvalPolicy.deleteMany({ where: { organizationId: orgId } });

  // 1. Setup global fixtures resolving circular User-Organization dependency
  const user = await prisma.user.upsert({
    where: { id: "concurrency-test-user" },
    create: {
      id: "concurrency-test-user",
      email: "concurrency@test.com",
      name: "Concurrency Test User",
      role: "admin",
      password: "securepassword123",
    },
    update: {},
  });

  await prisma.organization.upsert({
    where: { id: orgId },
    create: {
      id: orgId,
      name: "Concurrency Test Org",
      createdBy: user.id,
    },
    update: {},
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { organizationId: orgId },
  });

  // Create Approval Policy
  const policy = await prisma.approvalPolicy.upsert({
    where: { id: "concurrency-test-policy" },
    create: {
      id: "concurrency-test-policy",
      name: "Concurrency Test Policy",
      code: "CONC_POLICY",
      sourceType: "QA_COMPLETION",
      Organization: { connect: { id: orgId } },
    },
    update: {},
  });

  // Create Client
  const client = await prisma.client.upsert({
    where: { id: "concurrency-test-client" },
    create: {
      id: "concurrency-test-client",
      name: "Concurrency Client",
      email: "concurrency-client@test.com",
      clientCode: "C-1234567890",
      Organization: { connect: { id: orgId } },
      User: { connect: { id: user.id } },
    },
    update: {},
  });

  // Create Project
  await prisma.project.upsert({
    where: { id: "concurrency-test-project" },
    create: {
      id: "concurrency-test-project",
      status: "PLANNING",
      title: "Concurrency Test Project Title",
      Organization: { connect: { id: orgId } },
      Client: { connect: { id: client.id } },
      Owner: { connect: { id: user.id } },
    },
    update: {},
  });

  // ========================================================================
  // Smoke 1: Approval terminal transition
  // ========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("Smoke 1 — Approval terminal transition");
  console.log("------------------------------------------------------------");

  const appReq = await prisma.approvalRequest.create({
    data: {
      requestNumber: `REQ-${Date.now()}`,
      title: "Concurrency Terminal Approval Test",
      status: "PENDING",
      sourceType: "QA_COMPLETION",
      sourceId: `dummy-source-${Date.now()}`,
      Policy: { connect: { id: policy.id } },
      Organization: { connect: { id: orgId } },
      RequestedBy: { connect: { id: "concurrency-test-user" } },
      StepInstances: {
        create: {
          id: "concurrency-test-step-instance",
          sequence: 1,
          nameSnapshot: "Initial Step",
          Organization: { connect: { id: orgId } },
        }
      }
    },
  });

  const promises1 = Array.from({ length: 20 }, () =>
    launchWorker([`--smoke=1`, `--targetId=${appReq.id}`, `--orgId=${orgId}`])
  );
  const results1 = await Promise.all(promises1);

  const commits1 = results1.filter((r) => r.status === "COMMIT");
  const rejects1 = results1.filter((r) => r.status === "REJECT");
  const finalReq = await prisma.approvalRequest.findUnique({ where: { id: appReq.id } });

  console.log(`- Total Attempts: 20`);
  console.log(`- Commits: ${commits1.length}`);
  console.log(`- Rejections: ${rejects1.length}`);
  console.log(`- Final State: ${finalReq?.status}`);
  console.log(`- Duplicate immutable decisions: ${commits1.length - 1}`);

  if (commits1.length !== 1 || finalReq?.status !== "APPROVED") {
    console.error("FAIL: Smoke 1 failed concurrency check!");
    process.exit(1);
  }
  console.log("✅ Smoke 1 PASSED!");

  // ========================================================================
  // Smoke 2: Financial/idempotent protected operation
  // ========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("Smoke 2 — Financial/idempotent protected operation");
  console.log("------------------------------------------------------------");

  // Create Order
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}`,
      status: "PENDING",
      totalValue: 100.00,
      Organization: { connect: { id: orgId } },
      Client: { connect: { id: client.id } },
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${Date.now()}`,
      status: "draft",
      totalAmount: 100.00,
      Organization: { connect: { id: orgId } },
      Order: { connect: { id: order.id } },
    },
  });

  const promises2 = Array.from({ length: 20 }, () =>
    launchWorker([`--smoke=2`, `--targetId=${invoice.id}`, `--orgId=${orgId}`])
  );
  const results2 = await Promise.all(promises2);

  const commits2 = results2.filter((r) => r.status === "COMMIT");
  const rejects2 = results2.filter((r) => r.status === "REJECT");
  const finalInv = await prisma.invoice.findUnique({ where: { id: invoice.id } });

  console.log(`- Total Attempts: 20`);
  console.log(`- Commits: ${commits2.length}`);
  console.log(`- Rejections: ${rejects2.length}`);
  console.log(`- Final State: ${finalInv?.status}`);

  if (commits2.length !== 1 || finalInv?.status !== "posted") {
    console.error("FAIL: Smoke 2 failed concurrency check!");
    process.exit(1);
  }
  console.log("✅ Smoke 2 PASSED!");

  // ========================================================================
  // Smoke 3: Portal Change Request idempotency
  // ========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("Smoke 3 — Portal Change Request idempotency");
  console.log("------------------------------------------------------------");

  const idempotencyKey = `cr-key-${Date.now()}`;
  
  const promises3 = Array.from({ length: 20 }, () =>
    launchWorker([`--smoke=3`, `--idempotencyKey=${idempotencyKey}`, `--orgId=${orgId}`])
  );
  const results3 = await Promise.all(promises3);

  const commits3 = results3.filter((r) => r.status === "COMMIT");
  const rejects3 = results3.filter((r) => r.status === "REJECT");
  const crCount = await prisma.changeRequest.count({ where: { idempotencyKey } });

  console.log(`- Total Attempts: 20`);
  console.log(`- Commits: ${commits3.length}`);
  console.log(`- Rejections: ${rejects3.length}`);
  console.log(`- Duplicate CR count: ${crCount - 1}`);

  if (commits3.length !== 1 || crCount !== 1) {
    console.error("FAIL: Smoke 3 failed concurrency check!");
    process.exit(1);
  }
  console.log("✅ Smoke 3 PASSED!");

  // ========================================================================
  // Smoke 4: Phase 22 durable claim
  // ========================================================================
  console.log("\n------------------------------------------------------------");
  console.log("Smoke 4 — Phase 22 durable claim");
  console.log("------------------------------------------------------------");

  const job = await prisma.queueJob.create({
    data: {
      type: "webhook_delivery",
      payload: "{}",
      status: "PENDING",
      Organization: { connect: { id: orgId } },
    },
  });

  const promises4 = Array.from({ length: 20 }, () =>
    launchWorker([`--smoke=4`, `--targetId=${job.id}`, `--orgId=${orgId}`])
  );
  const results4 = await Promise.all(promises4);

  const commits4 = results4.filter((r) => r.status === "COMMIT");
  const rejects4 = results4.filter((r) => r.status === "REJECT");
  const finalJob = await prisma.queueJob.findUnique({ where: { id: job.id } });

  console.log(`- Total Attempts: 20`);
  console.log(`- Commits: ${commits4.length}`);
  console.log(`- Rejections: ${rejects4.length}`);
  console.log(`- Final Job Status: ${finalJob?.status}`);

  if (commits4.length !== 1 || finalJob?.status !== "CLAIMED") {
    console.error("FAIL: Smoke 4 failed concurrency check!");
    process.exit(1);
  }
  console.log("✅ Smoke 4 PASSED!");

  // ========================================================================
  // Teardown & Cleanup
  // ========================================================================
  console.log("\nCleaning up seeded concurrency test entities...");
  await prisma.approvalDecision.deleteMany({ where: { organizationId: orgId } });
  await prisma.approvalRequest.deleteMany({ where: { organizationId: orgId } });
  await prisma.changeRequest.deleteMany({ where: { organizationId: orgId } });
  await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
  await prisma.order.deleteMany({ where: { organizationId: orgId } });
  await prisma.queueJob.deleteMany({ where: { organizationId: orgId } });
  await prisma.notification.deleteMany({ where: { userId: "concurrency-test-user" } });
  await prisma.userLog.deleteMany({ where: { userId: "concurrency-test-user" } });
  await prisma.project.deleteMany({ where: { organizationId: orgId } });
  await prisma.client.deleteMany({ where: { organizationId: orgId } });
  await prisma.approvalPolicy.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { id: "concurrency-test-user" } });
  await prisma.organization.deleteMany({ where: { id: orgId } });

  console.log("\nConcurrency Smoke runner completed successfully!");
}

runSmokes().catch((err) => {
  console.error("Runner crash:", err);
  process.exit(1);
});
