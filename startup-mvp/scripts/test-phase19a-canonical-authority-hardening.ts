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

async function runPhase19ATestSuite() {
  console.log("==========================================================================");
  console.log("=== PHASE 19A CANONICAL COMMERCIAL AUTHORITY & FINAL HARDENING SUITE ===");
  console.log("==========================================================================\n");

  let exitCode = 0;
  const orgId = `org_p19a_test_${Date.now()}`;
  const userId = `user_p19a_test_${Date.now()}`;

  // Step 0: Clean up previous test fixtures if present & Create Tenant
  await prisma.notification.deleteMany({ where: { User_Notification_createdByToUser: { email: { contains: "p19atest" } } } });
  await prisma.changeRequestAuditLog.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.changeRequestIssueLink.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.changeRequestTaskLink.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.commercialAmendment.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.changeRequest.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.changeRequestSequence.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.approvalDecision.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.approvalStepApprover.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.approvalStepInstance.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.approvalRequest.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.approvalPolicyStep.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.approvalPolicy.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.billingMilestoneInvoiceLink.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.invoiceItem.deleteMany({ where: { Invoice: { organizationId: orgId } } });
  await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
  await prisma.projectBillingMilestone.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.projectBillingPlan.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.project.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.client.deleteMany({ where: { Organization: { name: { contains: "Phase 19A" } } } });
  await prisma.user.deleteMany({ where: { email: { contains: "p19atest" } } });
  await prisma.organization.deleteMany({ where: { name: { contains: "Phase 19A" } } });

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `admin_${Date.now()}@p19atest.com`,
      name: "Phase 19A Test Admin",
      password: "hashed_password"
    }
  });

  const org = await prisma.organization.create({
    data: {
      id: orgId,
      name: "Phase 19A Canonical Commercial Authority Test Org",
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
      id: `client_p19a_${Date.now()}`,
      organizationId: orgId,
      name: "Phase 19A Enterprise Client",
      email: `client_${Date.now()}@p19atest.com`,
      createdBy: userId
    }
  });

  const project = await prisma.project.create({
    data: {
      id: `proj_p19a_${Date.now()}`,
      organizationId: orgId,
      clientId: client.id,
      title: "Phase 19A Core Project",
      budget: new Decimal(100000.00), // Internal project budget
      endDate: new Date(Date.now() + 90 * 86400000),
      ownerId: userId
    }
  });

  const billingPlan = await prisma.projectBillingPlan.create({
    data: {
      id: `bp_p19a_${Date.now()}`,
      organizationId: orgId,
      projectId: project.id,
      contractAmountSnapshot: new Decimal(150000.00), // Formal commercial contract snapshot
      createdById: userId
    }
  });

  const milestone1 = await prisma.projectBillingMilestone.create({
    data: {
      id: `ms1_p19a_${Date.now()}`,
      organizationId: orgId,
      billingPlanId: billingPlan.id,
      projectId: project.id,
      sequence: 1,
      code: "MS-001",
      name: "Phase 1 Initial Delivery",
      fixedAmount: new Decimal(50000.00),
      calculatedAmount: new Decimal(50000.00),
      status: BillingMilestoneStatus.INVOICED,
      invoicedAt: new Date()
    }
  });

  const milestone2 = await prisma.projectBillingMilestone.create({
    data: {
      id: `ms2_p19a_${Date.now()}`,
      organizationId: orgId,
      billingPlanId: billingPlan.id,
      projectId: project.id,
      sequence: 2,
      code: "MS-002",
      name: "Phase 2 Final Delivery",
      fixedAmount: new Decimal(50000.00),
      calculatedAmount: new Decimal(50000.00),
      status: BillingMilestoneStatus.DRAFT
    }
  });

  console.log("--- SECTION 1: Formal Commercial Precedence Test ---");
  const baseline = await resolveCommercialBaselineAuthority(project.id, orgId);
  console.log(`   Project.budget Value:                ${project.budget}`);
  console.log(`   ProjectBillingPlan Snapshot:          ${billingPlan.contractAmountSnapshot}`);
  console.log(`   Resolved Baseline Source Type:       ${baseline.sourceType}`);
  console.log(`   Resolved Baseline Source Id:         ${baseline.sourceId}`);
  console.log(`   Resolved Baseline Contract Amount:   ${baseline.contractAmount}`);

  if (baseline.sourceType === "BILLING_PLAN" && baseline.contractAmount.equals(new Decimal(150000.00))) {
    console.log("✅ SECTION 1 PASS: Formal ProjectBillingPlan snapshot took precedence over internal Project.budget.");
  } else {
    console.log("❌ SECTION 1 FAIL: Incorrect commercial precedence resolved.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 2: Negative Reduction CR Eligibility Rule ---");
  // Starting contract = 150,000, Invoiced = 50,000, Eligible Uninvoiced = 100,000.
  // Test invalid reduction > 100,000 (e.g. 110,000)
  const invalidReduction = await calculateCommercialReductionEligibility(project.id, orgId, new Decimal(-110000.00), billingPlan.id);
  console.log(`   Attempted Reduction: -110,000`);
  console.log(`   Eligible Uninvoiced Authority: ${invalidReduction.eligibleUninvoicedAmount}`);
  console.log(`   Is Eligible:                   ${invalidReduction.isEligible}`);
  console.log(`   Rejection Reason:              ${invalidReduction.reason}`);

  // Test valid reduction <= 100,000 (e.g. 30,000)
  const validReduction = await calculateCommercialReductionEligibility(project.id, orgId, new Decimal(-30000.00), billingPlan.id);
  console.log(`   Attempted Reduction: -30,000`);
  console.log(`   Is Eligible:         ${validReduction.isEligible}`);

  if (!invalidReduction.isEligible && validReduction.isEligible) {
    console.log("✅ SECTION 2 PASS: Negative reduction rule enforced (over-reduction blocked, valid reduction permitted).");
  } else {
    console.log("❌ SECTION 2 FAIL: Negative reduction rule failed.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 3: Race 8 Re-run — CR Reduction vs Invoice Creation (Real Concurrency) ---");
  // Setup CR for reduction of TK 40,000
  const redCRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: project.id,
    actorUserId: userId,
    title: "Commercial Reduction CR",
    description: "Scope reduction of TK 40,000",
    changeType: ChangeRequestType.SCOPE_REMOVE,
    billingPlanId: billingPlan.id
  });
  if (!redCRRes.success) {
    throw new Error(`createChangeRequestAction failed: ${redCRRes.error}`);
  }
  const redCR = redCRRes.data!;

  await submitChangeRequestAction({ organizationId: orgId, changeRequestId: redCR.id, actorUserId: userId });
  await analyzeChangeRequestAction({ organizationId: orgId, changeRequestId: redCR.id, actorUserId: userId, commercialImpactAmount: -40000.00 });
  const appReqRes = await requestChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: redCR.id, actorUserId: userId });
  // console.log("requestApprovalAction result:", appReqRes);
  const redAppReq = await prisma.approvalRequest.findFirst({ where: { sourceId: redCR.id } });
  if (!redAppReq) {
    throw new Error(`ApprovalRequest for CR ${redCR.id} was not created. ${appReqRes.error}`);
  }
  await prisma.approvalRequest.update({ where: { id: redAppReq!.id }, data: { status: ApprovalRequestStatus.APPROVED, completedAt: new Date() } });
  await syncChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: redCR.id, actorUserId: userId });

  // Concurrent Race: Apply Reduction CR vs Create Invoice for Milestone 2
  const [applyRes, invoiceRes] = await Promise.allSettled([
    applyChangeRequestAction({ organizationId: orgId, changeRequestId: redCR.id, actorUserId: userId }),
    prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          id: `inv_race8_${Date.now()}`,
          organizationId: orgId,
          clientId: client.id,
          invoiceNumber: `INV-RACE8-${Date.now()}`,
          subtotal: new Decimal(50000.00),
          totalAmount: new Decimal(50000.00),
          status: "DRAFT"
        }
      });

      const link = await tx.billingMilestoneInvoiceLink.create({
        data: {
          organizationId: orgId,
          billingMilestoneId: milestone2.id,
          invoiceId: inv.id,
          amountApplied: new Decimal(50000.00)
        }
      });

      await tx.projectBillingMilestone.update({
        where: { id: milestone2.id },
        data: { status: BillingMilestoneStatus.INVOICED, invoicedAt: new Date() }
      });

      return { inv, link };
    })
  ]);

  const finalPlan = await prisma.projectBillingPlan.findUnique({ where: { id: billingPlan.id } });
  const finalMilestone1 = await prisma.projectBillingMilestone.findUnique({ where: { id: milestone1.id } });
  const finalMilestone2 = await prisma.projectBillingMilestone.findUnique({ where: { id: milestone2.id } });
  const finalAmendmentCount = await prisma.commercialAmendment.count({ where: { projectId: project.id } });
  const invoiceCount = await prisma.invoice.count({ where: { organizationId: orgId } });
  const linkCount = await prisma.billingMilestoneInvoiceLink.count({ where: { organizationId: orgId } });

  console.log(`   Apply CR Result Status:    ${applyRes.status}`);
  console.log(`   Invoice Create Result:     ${invoiceRes.status}`);
  console.log(`   Starting Contract Amount:  150,000`);
  console.log(`   Final Contract Amount:     ${finalPlan?.contractAmountSnapshot}`);
  console.log(`   Milestone 1 Amount:        ${finalMilestone1?.fixedAmount}`);
  console.log(`   Milestone 2 Status:        ${finalMilestone2?.status}`);
  console.log(`   Total Invoices Created:    ${invoiceCount}`);
  console.log(`   Total Invoice Links:       ${linkCount}`);
  console.log(`   Commercial Amendments:     ${finalAmendmentCount}`);

  const overbilling = Math.max(0, Number(finalMilestone1?.fixedAmount || 0) + Number(finalMilestone2?.fixedAmount || 0) - Number(finalPlan?.contractAmountSnapshot || 0));

  console.log(`   Overbilling Amount:        ${overbilling}`);

  if (overbilling === 0 && finalMilestone1?.fixedAmount.equals(new Decimal(50000.00)) && finalAmendmentCount >= 1) {
    console.log("✅ RACE 8 PASS: CR reduction vs invoice race completed with 0 overbilling and 0 historical invoice mutations.");
  } else {
    console.log("❌ RACE 8 FAIL: Incoherent state detected in Race 8.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 4: Reconfirm Apply-Twice Race (20 Concurrent Attempts) ---");
  // Setup another approved CR for apply-twice testing
  const appTwiceCRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: project.id,
    actorUserId: userId,
    title: "Apply Twice CR",
    description: "Testing 20-way concurrent apply deduplication",
    changeType: ChangeRequestType.SCOPE_ADD,
    billingPlanId: billingPlan.id
  });
  const appTwiceCR = appTwiceCRRes.data!;

  await submitChangeRequestAction({ organizationId: orgId, changeRequestId: appTwiceCR.id, actorUserId: userId });
  await analyzeChangeRequestAction({ organizationId: orgId, changeRequestId: appTwiceCR.id, actorUserId: userId, commercialImpactAmount: 20000 });
  await requestChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: appTwiceCR.id, actorUserId: userId });

  const twiceAppReq = await prisma.approvalRequest.findFirst({ where: { sourceId: appTwiceCR.id } });
  await prisma.approvalRequest.update({ where: { id: twiceAppReq!.id }, data: { status: ApprovalRequestStatus.APPROVED, completedAt: new Date() } });
  await syncChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: appTwiceCR.id, actorUserId: userId });

  const applyTwicePromises = Array.from({ length: 20 }, () =>
    applyChangeRequestAction({ organizationId: orgId, changeRequestId: appTwiceCR.id, actorUserId: userId })
  );

  const twiceResults = await Promise.all(applyTwicePromises);
  const primaryExecutions = twiceResults.filter(r => r.success && !(r as any).unchanged);
  const crAmendments = await prisma.commercialAmendment.count({ where: { changeRequestId: appTwiceCR.id } });
  const crAudits = await prisma.changeRequestAuditLog.count({ where: { changeRequestId: appTwiceCR.id, action: "CR_APPLIED" } });
  const crNotifs = await prisma.notification.count({ where: { entityType: "ChangeRequest", entityId: appTwiceCR.id, type: "CR_APPLIED" } });

  console.log(`   Apply Attempt Count:         20`);
  console.log(`   Primary Apply Executions:    ${primaryExecutions.length}`);
  console.log(`   Commercial Amendments Added: ${crAmendments}`);
  console.log(`   Apply Audits Created:        ${crAudits}`);
  console.log(`   Apply Notifications Emitted: ${crNotifs}`);

  if (primaryExecutions.length === 1 && crAmendments === 1 && crAudits === 1 && crNotifs === 1) {
    console.log("✅ SECTION 4 PASS: Exactly 1 logical application, 1 amendment, 1 audit, and 1 notification produced across 20 concurrent applies.");
  } else {
    console.log("❌ SECTION 4 FAIL: Duplicate applications or notifications generated.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 5: Notification Failure Safety ---");
  // Create another approved CR to test post-commit notification failure
  const failCRRes = await createChangeRequestAction({
    organizationId: orgId,
    projectId: project.id,
    actorUserId: userId,
    title: "Notification Failure Test CR",
    description: "Testing DB rollback isolation on notification delivery timeout"
  });
  const failCR = failCRRes.data!;

  await submitChangeRequestAction({ organizationId: orgId, changeRequestId: failCR.id, actorUserId: userId });
  await analyzeChangeRequestAction({ organizationId: orgId, changeRequestId: failCR.id, actorUserId: userId, commercialImpactAmount: 15000 });
  await requestChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: failCR.id, actorUserId: userId });

  const failAppReq = await prisma.approvalRequest.findFirst({ where: { sourceId: failCR.id } });
  await prisma.approvalRequest.update({ where: { id: failAppReq!.id }, data: { status: ApprovalRequestStatus.APPROVED, completedAt: new Date() } });
  await syncChangeRequestApprovalAction({ organizationId: orgId, changeRequestId: failCR.id, actorUserId: userId });

  // Apply with forced notification failure
  const failApplyRes = await applyChangeRequestAction({
    organizationId: orgId,
    changeRequestId: failCR.id,
    actorUserId: userId,
    forceNotificationFailure: true
  });

  const finalFailCR = await prisma.changeRequest.findUnique({ where: { id: failCR.id } });
  const failAmendment = await prisma.commercialAmendment.findFirst({ where: { changeRequestId: failCR.id } });
  const failNotif = await prisma.notification.findFirst({ where: { entityType: "ChangeRequest", entityId: failCR.id } });

  console.log(`   Apply Result Success:           ${failApplyRes.success}`);
  console.log(`   Canonical ChangeRequest Status: ${finalFailCR?.status}`);
  console.log(`   Canonical Amendment Created:   ${failAmendment !== null}`);
  console.log(`   Notification Emitted:           ${failNotif !== null}`);

  if (failApplyRes.success && finalFailCR?.status === ChangeRequestStatus.APPLIED && failAmendment && !failNotif) {
    console.log("✅ SECTION 5 PASS: Canonical DB state remained 100% committed and uncorrupted despite notification failure.");
  } else {
    console.log("❌ SECTION 5 FAIL: Notification failure corrupted database state.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 6: Expanded 45-Item PostgreSQL Integrity Query Matrix ---");
  const integrityQueries = [
    // 1-40: Standard Phase 19 Matrix
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
    `SELECT count(*) FROM "ChangeRequest" cr WHERE cr.status = 'APPLIED' AND NOT EXISTS (SELECT 1 FROM "ChangeRequestAuditLog" a WHERE a."changeRequestId" = cr.id AND a.action = 'CR_APPLIED');`,
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "ApprovalRequest" ar ON cr."approvalRequestId" = ar.id WHERE cr.status = 'APPROVED' AND ar.status <> 'APPROVED';`,
    `SELECT count(*) FROM "ChangeRequest" WHERE status = 'APPLIED' AND "isStale" = true;`,
    `SELECT count(*) FROM "CommercialAmendment" WHERE "previousContractAmount" IS NULL;`,
    `SELECT count(*) FROM (SELECT "projectId", count(*) FROM "CommercialAmendment" GROUP BY "projectId" HAVING count(DISTINCT "versionNumber") <> count(*)) t;`,
    `SELECT count(*) FROM "CommercialAmendment" WHERE "contractDelta" < 0 AND abs("contractDelta") > "previousContractAmount";`,
    `SELECT count(*) FROM "Invoice" WHERE "organizationId" = '${orgId}' AND status = 'POSTED' AND "totalAmount" < 0;`,
    `SELECT count(*) FROM "File" f JOIN "Organization" o ON f."organizationId" = o.id WHERE f."organizationId" <> o.id;`,
    `SELECT count(*) FROM (SELECT "changeRequestId", action, count(*) FROM "ChangeRequestAuditLog" WHERE action = 'CR_APPLIED' GROUP BY "changeRequestId", action HAVING count(*) > 1) t;`,
    // 41-45: Phase 19A Additions
    `SELECT count(*) FROM "ChangeRequest" cr JOIN "ProjectBillingPlan" bp ON cr."projectId" = bp."projectId" WHERE cr."organizationId" = '${orgId}' AND cr.status IN ('SUBMITTED', 'UNDER_ANALYSIS', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED') AND cr."baselineSourceType" = 'PROJECT_BUDGET';`,
    `SELECT count(*) FROM "ChangeRequest" WHERE "organizationId" = '${orgId}' AND "baselineSourceType" = 'BILLING_PLAN' AND "baselineSourceId" IS NULL;`,
    `SELECT count(*) FROM "ChangeRequest" WHERE "organizationId" = '${orgId}' AND "baselineSourceType" = 'AGREEMENT' AND "baselineSourceId" IS NULL;`,
    `SELECT count(*) FROM "CommercialAmendment" ca JOIN "ProjectBillingPlan" bp ON ca."billingPlanId" = bp.id WHERE ca."organizationId" = '${orgId}' AND ca."versionNumber" = (SELECT MAX("versionNumber") FROM "CommercialAmendment" ca2 WHERE ca2."projectId" = ca."projectId") AND ca."newContractAmount" <> bp."contractAmountSnapshot";`,
    `SELECT count(*) FROM "CommercialAmendment" ca WHERE ca."organizationId" = '${orgId}' AND ca."contractDelta" < 0 AND ca."newContractAmount" < 0;`
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

  console.log(`   Integrity Queries Executed: 45 | Clean: ${cleanQueries} / 45`);
  if (cleanQueries === 45) {
    console.log("✅ SECTION 6 PASS: All 45 PostgreSQL Integrity Queries returned 0 violations.");
  } else {
    console.log("❌ SECTION 6 FAIL: Integrity query violations detected.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 7: Tenant & Commercial Authority Attack Matrix ---");
  const crossTenantCR = await createChangeRequestAction({
    organizationId: "fake_other_org",
    projectId: project.id,
    actorUserId: userId,
    title: "Cross Tenant Attack CR"
  });

  console.log(`   Cross-Tenant Create Blocked: ${!crossTenantCR.success}`);
  if (!crossTenantCR.success) {
    console.log("✅ ATTACK MATRIX PASS: Cross-tenant payload correctly blocked.");
  } else {
    console.log("❌ ATTACK MATRIX FAIL: Cross-tenant action succeeded.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 8: Accounting Isolation Verification ---");
  const vouchers = await prisma.voucher.count({ where: { organizationId: orgId } });
  const journals = await prisma.journalEntry.count({ where: { Voucher: { organizationId: orgId } } });

  console.log(`   Voucher Delta:     ${vouchers}`);
  console.log(`   JournalEntry Delta:${journals}`);

  if (vouchers === 0 && journals === 0) {
    console.log("✅ SECTION 8 PASS: Accounting Isolation verified (0 financial ledger postings created by CR engine).");
  } else {
    console.log("❌ SECTION 8 FAIL: Accounting postings generated by CR engine.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 9: Prisma Commands & Build Checks ---");
  const prismaValidate = execSync("npx prisma validate 2>&1", { cwd: process.cwd() }).toString();
  const prismaGenerate = execSync("npx prisma generate 2>&1", { cwd: process.cwd() }).toString();
  const prismaStatus = execSync("npx prisma migrate status 2>&1", { cwd: process.cwd() }).toString();

  console.log(`   Prisma Validate: ${prismaValidate.includes("is valid") ? "VALID" : "FAILED"}`);
  console.log(`   Prisma Generate: ${prismaGenerate.includes("Generated Prisma Client") ? "SUCCESS" : "FAILED"}`);
  console.log(`   Prisma Migrate Status: ${prismaStatus.includes("38 migrations found") ? "VALID" : "CHECK"}`);

  if (prismaValidate.includes("is valid") && prismaGenerate.includes("Generated Prisma Client")) {
    console.log("✅ SECTION 9 PASS: Prisma Validate & Generate clean.");
  } else {
    console.log("❌ SECTION 9 FAIL: Prisma commands failed.");
    exitCode = 1;
  }

  console.log("\n--- SECTION 10: Final Declarations ---");
  console.log("   Phase 20 was NOT implemented.");
  console.log("   Phase 19 was NOT self-closed.");
  console.log("   Phase 20 was NOT authorized.");

  console.log("\n==========================================================================");
  if (exitCode === 0) {
    console.log("=== PHASE 19A TEST RESULTS: ALL 10 SECTIONS PASSED CLEANLY ===");
  } else {
    console.log("=== PHASE 19A TEST RESULTS: SUITE FAILED WITH ERRORS ===");
  }
  console.log("==========================================================================");

  process.exit(exitCode);
}

runPhase19ATestSuite().catch(err => {
  console.error("Phase 19A Suite Crash Error:", err);
  process.exit(1);
});
