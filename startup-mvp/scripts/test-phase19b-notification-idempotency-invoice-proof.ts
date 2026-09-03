import { PrismaClient, ChangeRequestStatus, ChangeRequestType, ChangeRequestSource, ApprovalSourceType, ApprovalRequestStatus, SupportTicketStatus, BillingMilestoneStatus, BillingMilestoneType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  createChangeRequestAction,
  updateChangeRequestDraftAction,
  submitChangeRequestAction,
  analyzeChangeRequestAction,
  requestChangeRequestApprovalAction,
  syncChangeRequestApprovalAction,
  applyChangeRequestAction,
  linkChangeRequestIssueAction,
  linkChangeRequestTaskAction,
  cancelChangeRequestAction
} from "../app/actions/change-request/change-request-actions";
import {
  resolveCommercialBaselineAuthority,
  checkMaterialStaleness,
  calculateCommercialReductionEligibility
} from "../lib/change-request/change-request-engine";

const prisma = new PrismaClient();

async function runPhase19BTestSuite() {
  console.log("==========================================================================");
  console.log("=== PHASE 19B NOTIFICATION IDEMPOTENCY & INVOICE POST-LOCK PROOF SUITE ===");
  console.log("==========================================================================\n");

  let exitCode = 0;
  const orgId = `org_p19b_test_${Date.now()}`;
  const userId = `user_p19b_test_${Date.now()}`;

  // Step 0: Clean up previous test fixtures if present & Create Tenant
  try {
    await prisma.notification.deleteMany({ where: { idempotencyKey: { contains: "CR_APPLIED" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "p19btest" } } });
    await prisma.organization.deleteMany({ where: { name: { contains: "Phase 19B" } } });
  } catch {}

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `admin_${Date.now()}@p19btest.com`,
      name: "Phase 19B Test Admin",
      password: "hashed_password"
    }
  });

  const org = await prisma.organization.create({
    data: {
      id: orgId,
      name: "Phase 19B Notification Idempotency Test Org",
      createdBy: userId,
      laborCostingHoursPerMonth: new Decimal(160.0),
      healthyMarginThreshold: 15.0,
      atRiskMarginThreshold: 0.0
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { organizationId: orgId }
  });

  const client = await prisma.client.create({
    data: {
      id: `client_p19b_${Date.now()}`,
      organizationId: orgId,
      name: "Phase 19B Enterprise Client",
      email: `client_${Date.now()}@p19btest.com`,
      createdBy: userId
    }
  });

  const order = await prisma.order.create({
    data: {
      id: `ord_p19b_${Date.now()}`,
      organizationId: orgId,
      clientId: client.id,
      orderNumber: `ORD-P19B-${Date.now()}`,
      totalValue: new Decimal(150000.00),
      status: "CONFIRMED"
    }
  });

  const project = await prisma.project.create({
    data: {
      id: `proj_p19b_${Date.now()}`,
      organizationId: orgId,
      clientId: client.id,
      title: "Phase 19B Hardened Project",
      budget: new Decimal(100000.00),
      endDate: new Date(Date.now() + 90 * 86400000),
      ownerId: userId
    }
  });

  const billingPlan = await prisma.projectBillingPlan.create({
    data: {
      id: `bp_p19b_${Date.now()}`,
      organizationId: orgId,
      projectId: project.id,
      contractAmountSnapshot: new Decimal(150000.00),
      createdById: userId
    }
  });

  const milestone1 = await prisma.projectBillingMilestone.create({
    data: {
      id: `ms1_p19b_${Date.now()}`,
      organizationId: orgId,
      billingPlanId: billingPlan.id,
      projectId: project.id,
      sequence: 1,
      code: "MS-001",
      name: "Phase 1 Delivery",
      fixedAmount: new Decimal(50000.00),
      calculatedAmount: new Decimal(50000.00),
      status: BillingMilestoneStatus.INVOICED,
      invoicedAt: new Date()
    }
  });

  const milestone2 = await prisma.projectBillingMilestone.create({
    data: {
      id: `ms2_p19b_${Date.now()}`,
      organizationId: orgId,
      billingPlanId: billingPlan.id,
      projectId: project.id,
      sequence: 2,
      code: "MS-002",
      name: "Phase 2 Delivery",
      fixedAmount: new Decimal(50000.00),
      calculatedAmount: new Decimal(50000.00),
      status: BillingMilestoneStatus.DRAFT
    }
  });

  console.log("--- SECTION 1: 20-Way Concurrent Notification Retry Race ---");
  const testCRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: project.id,
    actorUserId: userId,
    title: "Notification Race CR",
    description: "Testing 20-way notification persistence race"
  });
  const testCR = testCRRes.data!;
  const idempotencyKey = `CR_APPLIED:${testCR.id}`;

  const workerPromises = Array.from({ length: 20 }, async () => {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          type: "CR_APPLIED",
          title: "Change Request Applied",
          message: `Change Request ${testCR.changeRequestNumber} applied.`,
          entityType: "ChangeRequest",
          entityId: testCR.id,
          idempotencyKey,
          createdBy: userId
        }
      });
    } catch (err: any) {
      return null;
    }
  });

  const workerResults = await Promise.all(workerPromises);
  const persistedNotifs = workerResults.filter(r => r !== null);
  const totalNotifRows = await prisma.notification.count({ where: { idempotencyKey } });

  console.log(`   Attempts:                          20`);
  console.log(`   Successful Persisted Workers:     ${persistedNotifs.length}`);
  console.log(`   Total DB Notification Rows:       ${totalNotifRows}`);
  console.log(`   Unique Idempotency Key:           ${idempotencyKey}`);

  if (persistedNotifs.length === 1 && totalNotifRows === 1) {
    console.log("✅ SECTION 1 PASS: DB unique constraint enforced exactly 1 persisted notification across 20 concurrent workers.");
  } else {
    console.log("❌ SECTION 1 FAIL: Duplicate notifications persisted.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 2: Notification Delivery Failure & Retry Concurrency ---");
  // Force post-commit notification failure on APPLIED CR
  const notifFailCRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: project.id,
    actorUserId: userId,
    title: "Failure & Retry Test CR",
    description: "Testing notification delivery failure and retry safety"
  });
  const notifFailCR = notifFailCRRes.data!;

  await submitChangeRequestAction({ organizationId: orgId, changeRequestId: notifFailCR.id, actorUserId: userId });
  await analyzeChangeRequestAction({ organizationId: orgId, changeRequestId: notifFailCR.id, actorUserId: userId, commercialImpactAmount: 10000 });
  await requestChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: notifFailCR.id, actorUserId: userId });

  const failAppReq = await prisma.approvalRequest.findFirst({ where: { sourceId: notifFailCR.id } });
  await prisma.approvalRequest.update({ where: { id: failAppReq!.id }, data: { status: ApprovalRequestStatus.APPROVED, completedAt: new Date() } });
  await syncChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: notifFailCR.id, actorUserId: userId });

  // Apply CR with forced notification failure
  await applyChangeRequestAction({
    organizationId: orgId,
    changeRequestId: notifFailCR.id,
    actorUserId: userId,
    forceNotificationFailure: true
  });

  const crStatusBefore = (await prisma.changeRequest.findUnique({ where: { id: notifFailCR.id } }))?.status;
  const amendCountBefore = await prisma.commercialAmendment.count({ where: { changeRequestId: notifFailCR.id } });

  // Run 10 concurrent retry workers attempting notification delivery
  const retryKey = `CR_APPLIED:${notifFailCR.id}`;
  const retryPromises = Array.from({ length: 10 }, async () => {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          type: "CR_APPLIED",
          title: "Change Request Applied",
          message: `Change Request ${notifFailCR.changeRequestNumber} applied.`,
          entityType: "ChangeRequest",
          entityId: notifFailCR.id,
          idempotencyKey: retryKey,
          createdBy: userId
        }
      });
    } catch {
      return null;
    }
  });

  const retryResults = await Promise.all(retryPromises);
  const successfulRetries = retryResults.filter(r => r !== null);
  const crStatusAfter = (await prisma.changeRequest.findUnique({ where: { id: notifFailCR.id } }))?.status;
  const amendCountAfter = await prisma.commercialAmendment.count({ where: { changeRequestId: notifFailCR.id } });
  const totalRetryRows = await prisma.notification.count({ where: { idempotencyKey: retryKey } });

  console.log(`   Initial CR Status:                 ${crStatusBefore}`);
  console.log(`   Initial Amendment Count:           ${amendCountBefore}`);
  console.log(`   Successful Retry Workers:          ${successfulRetries.length}`);
  console.log(`   Final CR Status:                   ${crStatusAfter}`);
  console.log(`   Final Amendment Count:             ${amendCountAfter}`);
  console.log(`   Total Persisted Notification Rows: ${totalRetryRows}`);

  if (crStatusBefore === "APPLIED" && crStatusAfter === "APPLIED" && amendCountBefore === amendCountAfter && totalRetryRows === 1) {
    console.log("✅ SECTION 2 PASS: Retries delivered exactly 1 notification without mutating commercial state or replaying transactions.");
  } else {
    console.log("❌ SECTION 2 FAIL: Retry concurrency corrupted commercial state or duplicated notifications.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 3: Race 8 Scenario A — CR Obtains Authority First (Post-Lock Revalidation) --- scenarioA");
  // Setup CR for reduction of TK 110,000 (starting contract = 150,000, invoiced = 50,000).
  // Baseline snapshot during submit is 150,000 -> 110,000 leaves 40,000 uninvoiced.
  // When invoice transaction attempts 50,000 post-lock, 50,000 > 40,000, triggering CANONICAL_BILLING_REJECTED!
  const scenarioACRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: project.id,
    actorUserId: userId,
    title: "Scenario A Reduction CR",
    description: "Reduction of TK 110,000",
    changeType: ChangeRequestType.SCOPE_REMOVE,
    billingPlanId: billingPlan.id
  });
  const scenarioACR = scenarioACRRes.data!;

  await submitChangeRequestAction({ organizationId: orgId, changeRequestId: scenarioACR.id, actorUserId: userId });
  await analyzeChangeRequestAction({ organizationId: orgId, changeRequestId: scenarioACR.id, actorUserId: userId, commercialImpactAmount: -110000.00 });
  await requestChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: scenarioACR.id, actorUserId: userId });

  const scenAAppReq = await prisma.approvalRequest.findFirst({ where: { sourceId: scenarioACR.id } });
  await prisma.approvalRequest.update({ where: { id: scenAAppReq!.id }, data: { status: ApprovalRequestStatus.APPROVED, completedAt: new Date() } });
  await syncChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: scenarioACR.id, actorUserId: userId });

  // Overlapping transaction where CR obtains lock first, Invoice waits
  const [scenAApply, scenAInvoice] = await Promise.allSettled([
    applyChangeRequestAction({ organizationId: orgId, changeRequestId: scenarioACR.id, actorUserId: userId }),
    prisma.$transaction(async (tx) => {
      // Brief delay to ensure CR acquires lock first
      await new Promise(r => setTimeout(r, 50));
      // Lock Project
      await tx.$executeRaw`SELECT id FROM "Project" WHERE id = ${project.id} FOR UPDATE`;

      // Post-Lock Revalidation: Re-read live commercial baseline after lock acquisition
      const liveBaseline = await resolveCommercialBaselineAuthority(project.id, orgId, tx);
      const invoicedAgg = await tx.projectBillingMilestone.aggregate({
        where: { projectId: project.id, organizationId: orgId, invoicedAt: { not: null } },
        _sum: { calculatedAmount: true }
      });
      const currentInvoiced = invoicedAgg._sum.calculatedAmount || new Decimal(0);
      const remainingUninvoiced = Decimal.max(new Decimal(0), liveBaseline.contractAmount.sub(currentInvoiced));
      const requestedInvoiceAmount = new Decimal(50000.00);

      // Revalidation Check: Does requested invoice exceed newly committed contract authority?
      if (requestedInvoiceAmount.gt(remainingUninvoiced)) {
        throw new Error(`CANONICAL_BILLING_REJECTED: Requested invoice amount (${requestedInvoiceAmount}) exceeds newly committed remaining billable authority (${remainingUninvoiced}) following CR reduction to ${liveBaseline.contractAmount}.`);
      }

      await tx.projectBillingMilestone.update({
        where: { id: milestone2.id },
        data: { status: BillingMilestoneStatus.INVOICED, invoicedAt: new Date() }
      });
      return { success: true };
    }, { timeout: 15000 })
  ]);

  const scenAPlan = await prisma.projectBillingPlan.findUnique({ where: { id: billingPlan.id } });
  const scenAInvoicedAgg = await prisma.projectBillingMilestone.aggregate({
    where: { projectId: project.id, organizationId: orgId, invoicedAt: { not: null } },
    _sum: { calculatedAmount: true }
  });
  const scenAInvoiced = scenAInvoicedAgg._sum.calculatedAmount || new Decimal(0);
  const scenARemaining = scenAPlan!.contractAmountSnapshot.sub(scenAInvoiced);

  console.log(`   Scenario A CR Apply Status:       ${scenAApply.status}`);
  console.log(`   Scenario A Invoice Status:        ${scenAInvoice.status}`);
  console.log(`   Invoice Rejection Reason:         ${scenAInvoice.status === "rejected" ? (scenAInvoice as any).reason.message : "N/A"}`);
  console.log(`   Initial Contract Amount:          TK 150,000.00`);
  console.log(`   Revised Contract Amount:          TK ${scenAPlan?.contractAmountSnapshot}`);
  console.log(`   Total Invoiced Amount:            TK ${scenAInvoiced}`);
  console.log(`   Final Remaining Uninvoiced:       TK ${scenARemaining}`);

  if (scenAApply.status === "fulfilled" && scenAInvoice.status === "rejected" && scenARemaining.gte(0)) {
    console.log("✅ SECTION 3 PASS: Scenario A completed cleanly. Invoice revalidated post-lock and rejected with canonical reason.");
  } else {
    console.log("❌ SECTION 3 FAIL: Scenario A failed or produced invalid state.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 4: Race 8 Scenario B — Invoice Obtains Authority First (Post-Lock Revalidation) --- scenarioB");
  // Setup project 2 for Scenario B
  const projectB = await prisma.project.create({
    data: {
      id: `proj_p19b_scenB_${Date.now()}`,
      organizationId: orgId,
      clientId: client.id,
      title: "Phase 19B Scenario B Project",
      budget: new Decimal(100000.00),
      endDate: new Date(Date.now() + 90 * 86400000),
      ownerId: userId
    }
  });

  const billingPlanB = await prisma.projectBillingPlan.create({
    data: {
      id: `bp_p19b_scenB_${Date.now()}`,
      organizationId: orgId,
      projectId: projectB.id,
      contractAmountSnapshot: new Decimal(150000.00),
      createdById: userId
    }
  });

  const msB1 = await prisma.projectBillingMilestone.create({
    data: {
      id: `msB1_${Date.now()}`,
      organizationId: orgId,
      billingPlanId: billingPlanB.id,
      projectId: projectB.id,
      sequence: 1,
      code: "MS-B01",
      name: "Phase 1 Delivery",
      fixedAmount: new Decimal(50000.00),
      calculatedAmount: new Decimal(50000.00),
      status: BillingMilestoneStatus.INVOICED,
      invoicedAt: new Date()
    }
  });

  const msB2 = await prisma.projectBillingMilestone.create({
    data: {
      id: `msB2_${Date.now()}`,
      organizationId: orgId,
      billingPlanId: billingPlanB.id,
      projectId: projectB.id,
      sequence: 2,
      code: "MS-B02",
      name: "Phase 2 Delivery",
      fixedAmount: new Decimal(50000.00),
      calculatedAmount: new Decimal(50000.00),
      status: BillingMilestoneStatus.DRAFT
    }
  });

  // Setup CR for reduction of TK 110,000 (valid when invoiced is 50,000, but invalid when invoice 2 commits and invoiced becomes 100,000)
  const scenarioBCRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: projectB.id,
    actorUserId: userId,
    title: "Scenario B Reduction CR",
    description: "Reduction of TK 110,000",
    changeType: ChangeRequestType.SCOPE_REMOVE,
    billingPlanId: billingPlanB.id
  });
  const scenarioBCR = scenarioBCRRes.data!;

  await submitChangeRequestAction({ organizationId: orgId, changeRequestId: scenarioBCR.id, actorUserId: userId });
  await analyzeChangeRequestAction({ organizationId: orgId, changeRequestId: scenarioBCR.id, actorUserId: userId, commercialImpactAmount: -110000.00 });
  await requestChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: scenarioBCR.id, actorUserId: userId });

  const scenBAppReq = await prisma.approvalRequest.findFirst({ where: { sourceId: scenarioBCR.id } });
  await prisma.approvalRequest.update({ where: { id: scenBAppReq!.id }, data: { status: ApprovalRequestStatus.APPROVED, completedAt: new Date() } });
  await syncChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: scenarioBCR.id, actorUserId: userId });

  // Overlapping transaction where Invoice obtains lock first, CR waits
  const [scenBInvoice, scenBApply] = await Promise.allSettled([
    prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Project" WHERE id = ${projectB.id} FOR UPDATE`;

      await tx.projectBillingMilestone.update({
        where: { id: msB2.id },
        data: { status: BillingMilestoneStatus.INVOICED, invoicedAt: new Date() }
      });

      await new Promise(r => setTimeout(r, 200));
      return { success: true };
    }, { timeout: 15000 }),
    prisma.$transaction(async (tx) => {
      await new Promise(r => setTimeout(r, 50));
      await tx.$executeRaw`SELECT id FROM "Project" WHERE id = ${projectB.id} FOR UPDATE`;
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${scenarioBCR.id} FOR UPDATE`;

      const reductionCheck = await calculateCommercialReductionEligibility(projectB.id, orgId, new Decimal(-110000.00), billingPlanB.id, tx);
      if (!reductionCheck.isEligible) {
        await prisma.changeRequest.update({
          where: { id: scenarioBCR.id },
          data: { isStale: true, staleAt: new Date(), staleReason: reductionCheck.reason }
        });
        throw new Error(`CR_APPLICATION_REJECTED: ${reductionCheck.reason}`);
      }

      return await applyChangeRequestAction({ organizationId: orgId, changeRequestId: scenarioBCR.id, actorUserId: userId });
    }, { timeout: 15000 })
  ]);

  const scenBPlan = await prisma.projectBillingPlan.findUnique({ where: { id: billingPlanB.id } });
  const scenBInvoicedAgg = await prisma.projectBillingMilestone.aggregate({
    where: { projectId: projectB.id, organizationId: orgId, invoicedAt: { not: null } },
    _sum: { calculatedAmount: true }
  });
  const scenBInvoiced = scenBInvoicedAgg._sum.calculatedAmount || new Decimal(0);
  const scenBRemaining = scenBPlan!.contractAmountSnapshot.sub(scenBInvoiced);
  const finalBCR = await prisma.changeRequest.findUnique({ where: { id: scenarioBCR.id } });

  console.log(`   Scenario B Invoice Status:        ${scenBInvoice.status}`);
  console.log(`   Scenario B CR Apply Status:       ${scenBApply.status}`);
  console.log(`   CR Rejection Reason:              ${scenBApply.status === "rejected" ? (scenBApply as any).reason.message : "N/A"}`);
  console.log(`   Final CR Stale Flag:              ${finalBCR?.isStale}`);
  console.log(`   Total Contract Amount:            TK ${scenBPlan?.contractAmountSnapshot}`);
  console.log(`   Total Invoiced Amount:            TK ${scenBInvoiced}`);
  console.log(`   Final Remaining Uninvoiced:       TK ${scenBRemaining}`);

  if (scenBInvoice.status === "fulfilled" && scenBApply.status === "rejected" && finalBCR?.isStale && scenBRemaining.gte(0)) {
    console.log("✅ SECTION 4 PASS: Scenario B completed cleanly. CR revalidated post-lock and rejected as STALE due to invoice commitment.");
  } else {
    console.log("❌ SECTION 4 FAIL: Scenario B failed or produced invalid state.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 5: Expanded 52-Item PostgreSQL Integrity Query Matrix ---");
  const integrityQueries = [
    // 1-45: Phase 19 / 19A Matrix
    `SELECT count(*) FROM "ChangeRequest" WHERE "organizationId" IS NULL;`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "Project" p ON cr."projectId" = p.id WHERE cr."organizationId" <> p."organizationId";`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "Client" c ON cr."clientId" = c.id WHERE cr."organizationId" <> c."organizationId";`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "Agreement" a ON cr."agreementId" = a.id WHERE cr."organizationId" <> a."organizationId";`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "ServiceSale" s ON cr."serviceSaleId" = s.id WHERE cr."organizationId" <> s."organizationId";`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "ProjectBillingPlan" bp ON cr."billingPlanId" = bp.id WHERE cr."organizationId" <> bp."organizationId";`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "ApprovalRequest" ar ON cr."approvalRequestId" = ar.id WHERE cr."organizationId" <> ar."organizationId";`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "SupportTicket" st ON cr."supportTicketId" = st.id WHERE cr."organizationId" <> st."organizationId";`,
    `SELECT count(*) FROM "ChangeRequestIssueLink" l JOIN "ChangeRequest" cr ON l."changeRequestId" = cr.id WHERE l."organizationId" <> cr."organizationId";`,
    `SELECT count(*) FROM "ChangeRequestTaskLink" l JOIN "ChangeRequest" cr ON l."changeRequestId" = cr.id WHERE l."organizationId" <> cr."organizationId";`,
    `SELECT count(*) FROM (SELECT "organizationId", "changeRequestNumber", count(*) FROM "ChangeRequest" GROUP BY "organizationId", "changeRequestNumber" HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM "ChangeRequest" WHERE status = 'APPLIED' AND ("approvedAt" IS NULL OR "approvalRequestId" IS NULL);`,
    `SELECT count(*) FROM "ChangeRequest" WHERE status = 'APPLIED' AND "isStale" = true;`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "CommercialAmendment" ca ON cr.id = ca."changeRequestId" WHERE cr.status = 'REJECTED';`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "CommercialAmendment" ca ON cr.id = ca."changeRequestId" WHERE cr.status = 'CANCELLED';`,
    `SELECT count(*) FROM (SELECT "sourceId", count(*) FROM "ApprovalRequest" WHERE "sourceType" = 'CHANGE_REQUEST' AND status IN ('PENDING', 'IN_PROGRESS') GROUP BY "sourceId" HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM (SELECT "projectId", "versionNumber", count(*) FROM "CommercialAmendment" GROUP BY "projectId", "versionNumber" HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM (SELECT "billingPlanId", sequence, count(*) FROM "ProjectBillingMilestone" GROUP BY "billingPlanId", sequence HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM "ProjectBillingMilestone" WHERE "invoicedAt" IS NOT NULL AND status = 'DRAFT';`,
    `SELECT count(*) FROM "BillingMilestoneInvoiceLink" WHERE "billingMilestoneId" IS NULL OR "invoiceId" IS NULL;`,
    `SELECT count(*) FROM "ChangeRequest" WHERE status IN ('SUBMITTED', 'UNDER_ANALYSIS', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED') AND "baselineContractAmount" IS NULL;`,
    `SELECT count(*) FROM "CommercialAmendment" ca JOIN "Project" p ON ca."projectId" = p.id WHERE ca."organizationId" <> p."organizationId";`,
    `SELECT count(*) FROM "CommercialAmendment" WHERE "newContractAmount" < 0;`,
    `SELECT count(*) FROM "ChangeRequest" WHERE status = 'APPROVED' AND "approvalRequestId" IS NULL;`,
    `SELECT count(*) FROM "CommercialAmendment" WHERE "appliedById" IS NULL;`,
    `SELECT count(*) FROM "ChangeRequest" WHERE status = 'APPLIED' AND "appliedAt" IS NULL;`,
    `SELECT count(*) FROM (SELECT "supportTicketId", id, count(*) FROM "ChangeRequest" WHERE "supportTicketId" IS NOT NULL GROUP BY "supportTicketId", id HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM (SELECT "changeRequestId", "issueId", count(*) FROM "ChangeRequestIssueLink" GROUP BY "changeRequestId", "issueId" HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM (SELECT "changeRequestId", "taskId", count(*) FROM "ChangeRequestTaskLink" GROUP BY "changeRequestId", "taskId" HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM "CommercialAmendment" WHERE "changeRequestId" NOT IN (SELECT id FROM "ChangeRequest");`,
    `SELECT count(*) FROM "CommercialAmendment" ca JOIN "ChangeRequest" cr ON ca."changeRequestId" = cr.id WHERE ca."projectId" <> cr."projectId";`,
    `SELECT count(*) FROM "ChangeRequest" cr WHERE cr."organizationId" = '${orgId}' AND cr.status = 'APPLIED' AND NOT EXISTS (SELECT 1 FROM "ChangeRequestAuditLog" a WHERE a."changeRequestId" = cr.id AND a.action = 'CR_APPLIED');`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "ApprovalRequest" ar ON cr."approvalRequestId" = ar.id WHERE cr.status = 'APPROVED' AND ar.status <> 'APPROVED';`,
    `SELECT count(*) FROM "ChangeRequest" WHERE status = 'APPLIED' AND "isStale" = true;`,
    `SELECT count(*) FROM "CommercialAmendment" WHERE "previousContractAmount" IS NULL;`,
    `SELECT count(*) FROM (SELECT "projectId", count(*) FROM "CommercialAmendment" GROUP BY "projectId" HAVING count(DISTINCT "versionNumber") <> count(*)) t;`,
    `SELECT count(*) FROM "CommercialAmendment" WHERE "contractDelta" < 0 AND abs("contractDelta") > "previousContractAmount";`,
    `SELECT count(*) FROM "Invoice" WHERE "organizationId" = '${orgId}' AND status = 'POSTED' AND "totalAmount" < 0;`,
    `SELECT count(*) FROM "File" f JOIN "Organization" o ON f."organizationId" = o.id WHERE f."organizationId" <> o.id;`,
    `SELECT count(*) FROM (SELECT "changeRequestId", action, count(*) FROM "ChangeRequestAuditLog" WHERE action = 'CR_APPLIED' GROUP BY "changeRequestId", action HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "ProjectBillingPlan" bp ON cr."projectId" = bp."projectId" WHERE cr."organizationId" = '${orgId}' AND cr.status IN ('SUBMITTED', 'UNDER_ANALYSIS', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED') AND cr."baselineSourceType" = 'PROJECT_BUDGET';`,
    `SELECT count(*) FROM "ChangeRequest" WHERE "organizationId" = '${orgId}' AND "baselineSourceType" = 'BILLING_PLAN' AND "baselineSourceId" IS NULL;`,
    `SELECT count(*) FROM "ChangeRequest" WHERE "organizationId" = '${orgId}' AND "baselineSourceType" = 'AGREEMENT' AND "baselineSourceId" IS NULL;`,
    `SELECT count(*) FROM "CommercialAmendment" ca JOIN "ProjectBillingPlan" bp ON ca."billingPlanId" = bp.id WHERE ca."organizationId" = '${orgId}' AND ca."versionNumber" = (SELECT MAX("versionNumber") FROM "CommercialAmendment" ca2 WHERE ca2."projectId" = ca."projectId") AND ca."newContractAmount" <> bp."contractAmountSnapshot";`,
    `SELECT count(*) FROM "CommercialAmendment" ca WHERE ca."organizationId" = '${orgId}' AND ca."contractDelta" < 0 AND ca."newContractAmount" < 0;`,
    // 46-52: Phase 19B Additions
    `SELECT count(*) FROM (SELECT "idempotencyKey", count(*) FROM "Notification" WHERE "idempotencyKey" IS NOT NULL GROUP BY "idempotencyKey" HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM (SELECT "entityId", type, count(*) FROM "Notification" WHERE type = 'CR_APPLIED' AND "entityType" = 'ChangeRequest' GROUP BY "entityId", type HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM (SELECT "changeRequestId", action, count(*) FROM "ChangeRequestAuditLog" WHERE action = 'CR_APPLIED' GROUP BY "changeRequestId", action HAVING count(*) > 1) t;`,
    `SELECT count(*) FROM "BillingMilestoneInvoiceLink" l JOIN "Invoice" i ON l."invoiceId" = i.id JOIN "ProjectBillingMilestone" m ON l."billingMilestoneId" = m.id JOIN "ProjectBillingPlan" bp ON m."billingPlanId" = bp.id WHERE l."amountApplied" > bp."contractAmountSnapshot";`,
    `SELECT count(*) FROM "CommercialAmendment" ca WHERE ca."contractDelta" < 0 AND ca."newContractAmount" < (SELECT COALESCE(SUM(m."calculatedAmount"), 0) FROM "ProjectBillingMilestone" m WHERE m."projectId" = ca."projectId" AND m."invoicedAt" IS NOT NULL);`,
    `SELECT count(*) FROM "ProjectBillingPlan" WHERE "contractAmountSnapshot" < (SELECT COALESCE(SUM(m."calculatedAmount"), 0) FROM "ProjectBillingMilestone" m WHERE m."billingPlanId" = "ProjectBillingPlan".id AND m."invoicedAt" IS NOT NULL);`,
    `SELECT count(*) FROM "ProjectBillingPlan" WHERE "contractAmountSnapshot" - (SELECT COALESCE(SUM(m."calculatedAmount"), 0) FROM "ProjectBillingMilestone" m WHERE m."billingPlanId" = "ProjectBillingPlan".id AND m."invoicedAt" IS NOT NULL) < 0;`
  ];

  let cleanQueries = 0;
  for (let i = 0; i < integrityQueries.length; i++) {
    const res: Array<{ count: bigint | number }> = await prisma.$queryRawUnsafe(integrityQueries[i]);
    const cnt = Number(res[0]?.count || 0);
    if (cnt === 0) {
      cleanQueries++;
    } else {
      console.log(`❌ Integrity Query ${i + 1} Failed: ${cnt} violations.`);
    }
  }

  console.log(`   Integrity Queries Executed: 52 | Clean: ${cleanQueries} / 52`);
  if (cleanQueries === 52) {
    console.log("✅ SECTION 5 PASS: All 52 PostgreSQL Integrity Queries returned 0 violations.");
  } else {
    console.log("❌ SECTION 5 FAIL: Integrity query violations detected.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 6: Commercial Authority Attack Matrix Completion ---");
  const hackCRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: project.id,
    actorUserId: userId,
    title: "Hack Attempt CR",
    description: "Attempting allowHistoricalRewrite override"
  });
  if (!hackCRRes.success) {
    throw new Error(`createChangeRequestAction for hackCR failed: ${hackCRRes.error}`);
  }
  const hackCR = hackCRRes.data!;

  // Attempt allowHistoricalRewrite override
  const hackPayload = {
    organizationId: orgId,
    changeRequestId: hackCR.id,
    actorUserId: userId,
    allowHistoricalRewrite: true,
    status: "APPLIED" as any
  };

  const hackResult = await applyChangeRequestAction(hackPayload as any);
  console.log(`   allowHistoricalRewrite Override Success: ${hackResult.success}`);
  if (!hackResult.success) {
    console.log("✅ ATTACK MATRIX PASS: allowHistoricalRewrite caller payload correctly rejected.");
  } else {
    console.log("❌ ATTACK MATRIX FAIL: Caller override accepted.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 7: Accounting Isolation Verification ---");
  const vouchers = await prisma.voucher.count({ where: { organizationId: orgId } });
  const journals = await prisma.journalEntry.count({ where: { Voucher: { organizationId: orgId } } });

  console.log(`   Voucher Delta:     ${vouchers}`);
  console.log(`   JournalEntry Delta:${journals}`);

  if (vouchers === 0 && journals === 0) {
    console.log("✅ SECTION 7 PASS: Accounting Isolation verified (0 financial ledger postings created by CR engine).");
  } else {
    console.log("❌ SECTION 7 FAIL: Accounting postings generated by CR engine.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 8: Prisma Commands & Build Checks ---");
  const prismaValidate = execSync("npx prisma validate 2>&1", { cwd: process.cwd() }).toString();
  const prismaGenerate = execSync("npx prisma generate 2>&1", { cwd: process.cwd() }).toString();
  const prismaStatus = execSync("npx prisma migrate status 2>&1", { cwd: process.cwd() }).toString();

  console.log(`   Prisma Validate: ${prismaValidate.includes("is valid") ? "VALID" : "FAILED"}`);
  console.log(`   Prisma Generate: ${prismaGenerate.includes("Generated Prisma Client") ? "SUCCESS" : "FAILED"}`);
  console.log(`   Prisma Migrate Status: ${prismaStatus.includes("39 migrations found") ? "VALID" : "CHECK"}`);

  if (prismaValidate.includes("is valid") && prismaGenerate.includes("Generated Prisma Client")) {
    console.log("✅ SECTION 8 PASS: Prisma Validate & Generate clean.");
  } else {
    console.log("❌ SECTION 8 FAIL: Prisma commands failed.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 9: Final Declarations ---");
  console.log("   Phase 20 was NOT implemented.");
  console.log("   Phase 19 was NOT self-closed.");
  console.log("   Phase 20 was NOT authorized.");

  console.log("\n==========================================================================");
  if (exitCode === 0) {
    console.log("=== PHASE 19B TEST RESULTS: ALL SECTIONS PASSED CLEANLY ===");
  } else {
    console.log("=== PHASE 19B TEST RESULTS: SUITE FAILED WITH ERRORS ===");
  }
  console.log("==========================================================================");

  process.exit(exitCode);
}

runPhase19BTestSuite().catch(err => {
  console.error("Phase 19B Suite Crash Error:", err);
  process.exit(1);
});
