import { prisma } from "../../lib/prisma";

async function run() {
  const args = process.argv.slice(2);
  const smoke = args.find((a) => a.startsWith("--smoke="))?.split("=")[1];
  const targetId = args.find((a) => a.startsWith("--targetId="))?.split("=")[1];
  const idempotencyKey = args.find((a) => a.startsWith("--idempotencyKey="))?.split("=")[1];
  const orgId = args.find((a) => a.startsWith("--orgId="))?.split("=")[1] || "concurrency-test-org";
  
  const pid = process.pid;

  if (smoke === "1") {
    // Smoke 1: Approval terminal transition
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Find request using raw FOR UPDATE select to ensure isolation
        const reqs = await tx.$queryRaw<any[]>`
          SELECT id, status FROM "ApprovalRequest" 
          WHERE id = ${targetId} 
          FOR UPDATE
        `;
        const req = reqs[0];
        if (!req || req.status !== "PENDING") {
          throw new Error("Already approved or not found");
        }
        
        await tx.approvalRequest.update({
          where: { id: targetId },
          data: { status: "APPROVED" },
        });

        // Insert approval decision log
        await tx.approvalDecision.create({
          data: {
            decision: "APPROVED",
            comment: `Approved by PID ${pid}`,
            Organization: { connect: { id: orgId } },
            ApprovalRequest: { connect: { id: targetId } },
            StepInstance: { connect: { id: "concurrency-test-step-instance" } },
            ApproverUser: { connect: { id: "concurrency-test-user" } },
          },
        });
        
        return { success: true };
      });
      console.log(JSON.stringify({ pid, status: "COMMIT", ...result }));
    } catch (err: any) {
      console.log(JSON.stringify({ pid, status: "REJECT", error: err.message }));
    }
  } else if (smoke === "2") {
    // Smoke 2: Financial/idempotent protected operation
    try {
      const result = await prisma.$transaction(async (tx) => {
        const invoices = await tx.$queryRaw<any[]>`
          SELECT id, status FROM "Invoice" 
          WHERE id = ${targetId} 
          FOR UPDATE
        `;
        const inv = invoices[0];
        if (!inv || inv.status !== "draft") {
          throw new Error("Invoice already posted or paid");
        }

        await tx.invoice.update({
          where: { id: targetId },
          data: { status: "posted" },
        });
        
        return { success: true };
      });
      console.log(JSON.stringify({ pid, status: "COMMIT", ...result }));
    } catch (err: any) {
      console.log(JSON.stringify({ pid, status: "REJECT", error: err.message }));
    }
  } else if (smoke === "3") {
    // Smoke 3: Portal Change Request idempotency
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Query to check if key already exists
        const existing = await tx.changeRequest.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          throw new Error("Duplicate idempotency key detected");
        }

        const cr = await tx.changeRequest.create({
          data: {
            changeRequestNumber: `CR-NUM-${pid}-${Date.now()}`,
            title: `CR from PID ${pid}`,
            description: "Idempotent change request",
            status: "SUBMITTED",
            idempotencyKey: idempotencyKey!,
            Organization: { connect: { id: orgId } },
            Project: { connect: { id: "concurrency-test-project" } },
            CreatedBy: { connect: { id: "concurrency-test-user" } },
          },
        });

        // Create audit record
        await tx.userLog.create({
          data: {
            action: "CHANGE_REQUEST_SUBMIT",
            details: `CR created by PID ${pid}`,
            ipAddress: "127.0.0.1",
            User: { connect: { id: "concurrency-test-user" } },
          },
        });

        // Create notification
        await tx.notification.create({
          data: {
            title: "New CR Submitted",
            message: `CR created by PID ${pid}`,
            type: "INFO",
            User_Notification_userIdToUser: { connect: { id: "concurrency-test-user" } },
          },
        });

        return { success: true, crId: cr.id };
      });
      console.log(JSON.stringify({ pid, status: "COMMIT", ...result }));
    } catch (err: any) {
      console.log(JSON.stringify({ pid, status: "REJECT", error: err.message }));
    }
  } else if (smoke === "4") {
    // Smoke 4: Queue Job durable claim
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Atomic update claiming a pending job
        const updated = await tx.$executeRaw`
          UPDATE "QueueJob"
          SET status = 'CLAIMED', "claimedBy" = ${`worker-${pid}`}, "leaseUntil" = ${new Date(Date.now() + 10000)}
          WHERE id = ${targetId} AND status = 'PENDING'
        `;
        if (updated === 0) {
          throw new Error("Job already claimed or not found");
        }
        return { success: true };
      });
      console.log(JSON.stringify({ pid, status: "COMMIT", ...result }));
    } catch (err: any) {
      console.log(JSON.stringify({ pid, status: "REJECT", error: err.message }));
    }
  }
}

run().catch((err) => {
  console.error("Worker crash:", err);
  process.exit(1);
});
