"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { validateDevelopmentCompletionEligibility } from "@/app/actions/crm/development-operations.action";
import { validateCreativeCompletionEligibility } from "@/app/actions/crm/creative-operations.action";
import { validateMarketingCompletionEligibility } from "@/app/actions/crm/marketing-operations.action";
import {
  QARequirementStatus,
  QAPlanStatus,
  QATestCycleType,
  QATestCycleStatus,
  QATestCasePriority,
  QATestExecutionStatus,
  ProjectStatus,
  AllocationStatus,
  BuildStatus,
  IssueStatus,
  Prisma,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// TENANT-CONFIGURABLE QA CAPABILITY POLICY (Phase 14 Isolated)
// ---------------------------------------------------------------------------

const QA_CAPABILITY_KEY = "QA_EXECUTION";
const DEVELOPMENT_CAPABILITY_KEY = "DEVELOPMENT_EXECUTION";
const CREATIVE_CAPABILITY_KEY = "CREATIVE_EXECUTION";
const MARKETING_CAPABILITY_KEY = "MARKETING_EXECUTION";

export async function isQAQualifiedEmployee(employee: {
  status?: string | null;
  designation?: string | null;
  department?: string | null;
  DepartmentRef?: { name?: string | null; code?: string | null; capabilities?: string[] } | null;
  TeamRef?: { name?: string | null; code?: string | null; capabilities?: string[] } | null;
}): Promise<boolean> {
  if (!employee || employee.status !== "active") return false;

  // 1. CANONICAL TEAM CHECK (Takes precedence if present)
  if (employee.TeamRef) {
    const teamCaps = employee.TeamRef.capabilities || [];
    if (teamCaps.includes(QA_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 2. CANONICAL DEPARTMENT CHECK
  if (employee.DepartmentRef) {
    const deptCaps = employee.DepartmentRef.capabilities || [];
    if (deptCaps.includes(QA_CAPABILITY_KEY)) {
      return true;
    }
  }

  // ABSOLUTE RULE: Zero text fallback!
  return false;
}

export async function isQAQualifiedAllocation(allocation: {
  status: string;
  projectRole?: string | null;
  Department?: { name?: string | null; code?: string | null; capabilities?: string[] } | null;
  Team?: { name?: string | null; code?: string | null; capabilities?: string[] } | null;
  Employee?: {
    status?: string | null;
    designation?: string | null;
    department?: string | null;
    DepartmentRef?: { name?: string | null; code?: string | null; capabilities?: string[] } | null;
    TeamRef?: { name?: string | null; code?: string | null; capabilities?: string[] } | null;
  } | null;
}): Promise<boolean> {
  if (!allocation) return false;
  if (allocation.status !== AllocationStatus.PLANNED && allocation.status !== AllocationStatus.ACTIVE) {
    return false;
  }

  // 1. CANONICAL TEAM CAPABILITY CHECK
  if (allocation.Team) {
    const teamCaps = allocation.Team.capabilities || [];
    if (teamCaps.includes(QA_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 2. CANONICAL DEPARTMENT CAPABILITY CHECK
  if (allocation.Department) {
    const deptCaps = allocation.Department.capabilities || [];
    if (deptCaps.includes(QA_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 3. EMPLOYEE CANONICAL CAPABILITY CHECK
  if (allocation.Employee) {
    return await isQAQualifiedEmployee(allocation.Employee);
  }

  return false;
}

// ---------------------------------------------------------------------------
// AUTHORITATIVE QA READINESS VALIDATOR (Phase 14)
// ---------------------------------------------------------------------------

export async function validateQAReadinessEligibility(
  projectId: string,
  txClient?: Prisma.TransactionClient
) {
  const db = txClient || prisma;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      ResourceAllocations: {
        include: {
          Department: { select: { name: true, code: true, capabilities: true } },
          Team: { select: { name: true, code: true, capabilities: true } },
          Employee: {
            select: {
              id: true,
              name: true,
              status: true,
              designation: true,
              department: true,
              DepartmentRef: { select: { name: true, code: true, capabilities: true } },
              TeamRef: { select: { name: true, code: true, capabilities: true } },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return { eligible: false, error: "Project not found." };
  }

  if (project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.COMPLETED) {
    return { eligible: false, error: `Cannot mark '${project.status}' project ready for QA Execution.` };
  }

  if (!project.resourcePlanningReadyAt) {
    return {
      eligible: false,
      error: "Business Gate Blocked: Project must pass Phase 9 Resource Planning Readiness gate before QA Execution.",
    };
  }

  // Check stored ProjectDepartmentDependency records for QA_EXECUTION
  const deps = await db.projectDepartmentDependency.findMany({
    where: { projectId, downstreamCapability: QA_CAPABILITY_KEY, required: true },
  });

  const hasDevPrereq = deps.some((d) => d.upstreamCapability === DEVELOPMENT_CAPABILITY_KEY);
  const hasCreativePrereq = deps.some((d) => d.upstreamCapability === CREATIVE_CAPABILITY_KEY);
  const hasMarketingPrereq = deps.some((d) => d.upstreamCapability === MARKETING_CAPABILITY_KEY);

  // 1. Upstream Development Dependency Check
  if (hasDevPrereq) {
    if (!project.developmentCompletedAt) {
      return {
        eligible: false,
        error: "Business Gate Blocked: Upstream Development completion (developmentCompletedAt) is required but missing.",
      };
    }
    const devVal = await validateDevelopmentCompletionEligibility(projectId, db);
    if (!devVal.eligible) {
      return {
        eligible: false,
        error: `Business Gate Blocked: Upstream Development completion is stale/invalid (${devVal.error}).`,
      };
    }
  }

  // 2. Upstream Creative Dependency Check
  if (hasCreativePrereq) {
    if (!project.creativeCompletedAt) {
      return {
        eligible: false,
        error: "Business Gate Blocked: Upstream Creative completion (creativeCompletedAt) is required but missing.",
      };
    }
    const creativeVal = await validateCreativeCompletionEligibility(projectId);
    if (!creativeVal.eligible) {
      return {
        eligible: false,
        error: `Business Gate Blocked: Upstream Creative completion is stale/invalid (${creativeVal.reason}).`,
      };
    }
  }

  // 3. Upstream Marketing Dependency Check
  if (hasMarketingPrereq) {
    if (!project.marketingCompletedAt) {
      return {
        eligible: false,
        error: "Business Gate Blocked: Upstream Marketing completion (marketingCompletedAt) is required but missing.",
      };
    }
    const mktVal = await validateMarketingCompletionEligibility(projectId, db);
    if (!mktVal.eligible) {
      return {
        eligible: false,
        error: `Business Gate Blocked: Upstream Marketing completion is stale/invalid (${mktVal.error}).`,
      };
    }
  }

  // 4. QA_EXECUTION Capability-backed Allocation Check
  const qualifyingAllocations = [];
  for (const a of project.ResourceAllocations) {
    if (await isQAQualifiedAllocation(a)) {
      qualifyingAllocations.push(a);
    }
  }

  if (qualifyingAllocations.length === 0) {
    return {
      eligible: false,
      error: "Business Gate Blocked: Project has no qualifying QA resource allocations with 'QA_EXECUTION' capability.",
    };
  }

  return { eligible: true, project };
}

// ---------------------------------------------------------------------------
// AUTHORITATIVE QA COMPLETION VALIDATOR (Phase 14)
// ---------------------------------------------------------------------------

export async function validateQACompletionEligibility(
  projectId: string,
  txClient?: Prisma.TransactionClient
) {
  const db = txClient || prisma;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      QAPlans: { select: { id: true, status: true } },
      QATestCycles: {
        include: {
          BuildRecord: { select: { id: true, buildNumber: true, status: true } },
          Executions: {
            orderBy: [{ executionSequence: "desc" }],
            include: { TestCase: { select: { id: true, title: true, priority: true } } },
          },
        },
      },
      QATestCases: {
        include: {
          Executions: { orderBy: [{ executionSequence: "desc" }], take: 1 },
        },
      },
      Milestones: {
        include: {
          Issues: { select: { id: true, title: true, status: true, priority: true, type: true, organizationId: true } },
        },
      },
    },
  });

  if (!project) {
    return { eligible: false, error: "Project not found." };
  }

  if (project.qaWorkRequirement === QARequirementStatus.NOT_REQUIRED) {
    return { eligible: false, error: "Quality Assurance is not required for this Project." };
  }

  if (!project.qaExecutionReadyAt) {
    return { eligible: false, error: "Project has not passed QA Execution Readiness gate." };
  }

  if (project.QATestCycles.length === 0 && project.QAPlans.length === 0) {
    return { eligible: false, error: "Project must have at least one QA Plan or Test Cycle." };
  }

  // 1. Readiness Re-evaluation & Upstream Dependencies
  const readinessVal = await validateQAReadinessEligibility(projectId, db);
  if (!readinessVal.eligible) {
    return { eligible: false, error: `Cannot complete QA: QA readiness is invalid (${readinessVal.error}).` };
  }

  // 2. Mandatory Test Cycle Completion Gate
  const uncompletedCycles = project.QATestCycles.filter(
    (c) => c.status !== QATestCycleStatus.COMPLETED
  );
  if (uncompletedCycles.length > 0) {
    return {
      eligible: false,
      error: `Cannot complete QA: ${uncompletedCycles.length} test cycle(s) are not COMPLETED (e.g. '${uncompletedCycles[0].name}').`,
    };
  }

  // 3. Regression Cycle Gate (Phase 14A R1-R7 Matrix)
  const regressionCycles = project.QATestCycles.filter((c) => c.type === QATestCycleType.REGRESSION);
  for (const regCycle of regressionCycles) {
    if (regCycle.status !== QATestCycleStatus.COMPLETED) {
      return {
        eligible: false,
        error: `Cannot complete QA: Required Regression cycle '${regCycle.name}' is in status '${regCycle.status}' (must be COMPLETED).`,
      };
    }
  }

  // 4. Test Case Execution Gate (Must have at least 1 execution per test case)
  const unexecutedCases = project.QATestCases.filter((tc) => tc.Executions.length === 0);
  if (unexecutedCases.length > 0) {
    return {
      eligible: false,
      error: `Cannot complete QA: ${unexecutedCases.length} mandatory test case(s) have NOT been executed (e.g. '${unexecutedCases[0].title}').`,
    };
  }

  // 5. Test Execution Status Gate (Deterministic latest execution per test case must be PASSED)
  const failedOrBlockedCases = project.QATestCases.filter((tc) => {
    if (tc.Executions.length === 0) return true;
    const latest = tc.Executions[0];
    return latest.status === QATestExecutionStatus.FAILED || latest.status === QATestExecutionStatus.BLOCKED || latest.status === QATestExecutionStatus.NOT_RUN;
  });

  if (failedOrBlockedCases.length > 0) {
    const latestStatus = failedOrBlockedCases[0].Executions[0]?.status || "NOT_RUN";
    return {
      eligible: false,
      error: `Cannot complete QA: ${failedOrBlockedCases.length} test case(s) do not have a latest PASSED execution status (e.g. '${failedOrBlockedCases[0].title}' is '${latestStatus}').`,
    };
  }

  // 6. Tested Development Build Gate (Phase 14A QB1-QB7 Matrix)
  for (const cycle of project.QATestCycles) {
    if (cycle.BuildRecord) {
      if (cycle.BuildRecord.status !== BuildStatus.PASSED) {
        return {
          eligible: false,
          error: `Cannot complete QA: Development Build #${cycle.BuildRecord.buildNumber} associated with test cycle '${cycle.name}' is in status '${cycle.BuildRecord.status}' (must be PASSED).`,
        };
      }
    }
  }

  // 7. Canonical Blocking Issue Gate (0 open blockers/critical bugs)
  const allIssues = project.Milestones.flatMap((m) => m.Issues);
  const unresolvedBlockers = allIssues.filter((issue) => {
    if (issue.organizationId !== project.organizationId) return false;

    const isUnresolved = issue.status === IssueStatus.OPEN || issue.status === IssueStatus.IN_PROGRESS || issue.status === IssueStatus.REVIEW;
    const isBlocking =
      issue.priority === "HIGH" ||
      issue.priority === "URGENT" ||
      issue.priority === "CRITICAL" ||
      issue.type === "BLOCKER" ||
      issue.type === "BUG";

    return isUnresolved && isBlocking;
  });

  if (unresolvedBlockers.length > 0) {
    return {
      eligible: false,
      error: `Cannot complete QA: ${unresolvedBlockers.length} unresolved blocking issue(s) remain open (e.g. '${unresolvedBlockers[0].title}').`,
    };
  }

  return { eligible: true, project };
}

// ---------------------------------------------------------------------------
// 1. SET QA REQUIREMENT & MARK READY FOR QA EXECUTION
// ---------------------------------------------------------------------------

export async function setProjectQARequirement(projectId: string, requirement: QARequirementStatus) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { qaWorkRequirement: requirement },
    });

    await logItemUpdated("Project", updated.id, `Set QA Requirement to '${requirement}'`);
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);
    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to set QA requirement";
    console.error("setProjectQARequirement error:", error);
    return { success: false, error: msg };
  }
}

export async function markProjectReadyForQAExecution(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    // Authoritative Readiness Validation
    const readinessVal = await validateQAReadinessEligibility(projectId);
    if (!readinessVal.eligible) {
      return { success: false, error: readinessVal.error };
    }

    const now = new Date();
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        qaExecutionReadyAt: now,
        qaExecutionReadyById: session.user.id,
        qaWorkRequirement: QARequirementStatus.READY,
      },
    });

    await logItemUpdated("Project", updated.id, "Marked READY FOR QA EXECUTION");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark project ready for QA execution";
    console.error("markProjectReadyForQAExecution error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 2. GET PROJECT QA OPERATIONS
// ---------------------------------------------------------------------------

export async function getProjectQAOperations(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const plans = await prisma.projectQAPlan.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        CreatedBy: { select: { id: true, name: true, email: true } },
        TestCycles: true,
        TestCases: true,
      },
    });

    const testCycles = await prisma.projectQATestCycle.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        AssignedEmployee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            designation: true,
            status: true,
            department: true,
            DepartmentRef: { select: { name: true, code: true, capabilities: true } },
            TeamRef: { select: { name: true, code: true, capabilities: true } },
          },
        },
        BuildRecord: { select: { id: true, buildNumber: true, status: true, environment: true } },
        CreatedBy: { select: { id: true, name: true, email: true } },
        Executions: { orderBy: { executionSequence: "desc" }, take: 10 },
      },
    });

    const testCases = await prisma.qATestCase.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        Task: { select: { id: true, title: true, status: true } },
        CreatedBy: { select: { id: true, name: true, email: true } },
        Executions: { orderBy: { executionSequence: "desc" }, take: 1 },
      },
    });

    return {
      success: true,
      qaExecutionReadyAt: project.qaExecutionReadyAt,
      qaExecutionReadyById: project.qaExecutionReadyById,
      qaWorkRequirement: project.qaWorkRequirement,
      qaCompletedAt: project.qaCompletedAt,
      qaCompletedById: project.qaCompletedById,
      plans,
      testCycles,
      testCases,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch QA operations";
    console.error("getProjectQAOperations error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3. CREATE OR UPDATE QA PLAN
// ---------------------------------------------------------------------------

export async function createOrUpdateQAPlan(input: {
  projectId: string;
  planId?: string;
  title: string;
  objective?: string;
  scope?: string;
  outOfScope?: string;
  testStrategy?: string;
  entryCriteria?: string;
  exitCriteria?: string;
  environment?: string;
  startDate?: Date | string;
  targetEndDate?: Date | string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", input.planId ? "edit" : "create");

    if (!project.qaExecutionReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must be marked READY FOR QA EXECUTION before creating a QA Plan.",
      };
    }

    const start = input.startDate ? new Date(input.startDate) : null;
    const end = input.targetEndDate ? new Date(input.targetEndDate) : null;

    if (input.planId) {
      const existing = await prisma.projectQAPlan.findUnique({ where: { id: input.planId } });
      if (!existing || existing.organizationId !== project.organizationId) {
        return { success: false, error: "QA Plan not found" };
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.projectQAPlan.update({
          where: { id: input.planId },
          data: {
            title: input.title,
            objective: input.objective || null,
            scope: input.scope || null,
            outOfScope: input.outOfScope || null,
            testStrategy: input.testStrategy || null,
            entryCriteria: input.entryCriteria || null,
            exitCriteria: input.exitCriteria || null,
            environment: input.environment || "Staging",
            startDate: start,
            targetEndDate: end,
            updatedById: session.user.id,
          },
        });

        // DOWNSTREAM INVALIDATION
        await tx.project.update({
          where: { id: input.projectId },
          data: {
            qaCompletedAt: null,
            qaCompletedById: null,
            qaWorkRequirement: QARequirementStatus.IN_PROGRESS,
          },
        });

        return res;
      });

      await logItemUpdated("ProjectQAPlan", updated.id, `Updated QA plan: ${updated.title}`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, plan: updated };
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const res = await tx.projectQAPlan.create({
          data: {
            organizationId: project.organizationId,
            projectId: input.projectId,
            title: input.title,
            objective: input.objective || null,
            scope: input.scope || null,
            outOfScope: input.outOfScope || null,
            testStrategy: input.testStrategy || null,
            entryCriteria: input.entryCriteria || null,
            exitCriteria: input.exitCriteria || null,
            environment: input.environment || "Staging",
            startDate: start,
            targetEndDate: end,
            status: QAPlanStatus.DRAFT,
            createdById: session.user.id,
          },
        });

        await tx.project.update({
          where: { id: input.projectId },
          data: { qaWorkRequirement: QARequirementStatus.IN_PROGRESS },
        });

        return res;
      });

      await logItemCreated("ProjectQAPlan", created.id, `Created QA plan: ${created.title}`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, plan: created };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save QA Plan";
    console.error("createOrUpdateQAPlan error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 4. CREATE & UPDATE QA TEST CYCLE
// ---------------------------------------------------------------------------

export async function createQATestCycle(input: {
  projectId: string;
  qaPlanId?: string;
  name: string;
  type?: QATestCycleType;
  buildRecordId?: string;
  assignedEmployeeId?: string;
  environment?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "create");

    if (!project.qaExecutionReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must be marked READY FOR QA EXECUTION before creating QA Test Cycles.",
      };
    }

    if (input.assignedEmployeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: input.assignedEmployeeId },
        include: {
          DepartmentRef: { select: { name: true, code: true, capabilities: true } },
          TeamRef: { select: { name: true, code: true, capabilities: true } },
        },
      });

      if (!employee || employee.organizationId !== project.organizationId) {
        return { success: false, error: "Selected QA engineer does not belong to your organization." };
      }

      if (employee.status !== "active") {
        return { success: false, error: `Cannot assign inactive employee (Status: ${employee.status}).` };
      }

      const validAlloc = await prisma.projectResourceAllocation.findFirst({
        where: {
          projectId: input.projectId,
          employeeId: input.assignedEmployeeId,
          status: { in: [AllocationStatus.PLANNED, AllocationStatus.ACTIVE] },
        },
        include: {
          Department: { select: { name: true, code: true, capabilities: true } },
          Team: { select: { name: true, code: true, capabilities: true } },
        },
      });

      if (!validAlloc) {
        return {
          success: false,
          error: "Phase 10 Resource Allocation Gate: Selected QA engineer has no active or planned Resource Allocation on this Project.",
        };
      }

      const allocQualifies = isQAQualifiedAllocation({ ...validAlloc, Employee: employee });

      if (!allocQualifies) {
        return {
          success: false,
          error: `Phase 14 Capability Gate: Employee '${employee.name}' is not assigned to a canonical QA-capable department/team with 'QA_EXECUTION' capability.`,
        };
      }
    }

    const testCycle = await prisma.$transaction(async (tx) => {
      const created = await tx.projectQATestCycle.create({
        data: {
          organizationId: project.organizationId,
          projectId: input.projectId,
          qaPlanId: input.qaPlanId || null,
          name: input.name,
          type: input.type || QATestCycleType.FUNCTIONAL,
          buildRecordId: input.buildRecordId || null,
          assignedEmployeeId: input.assignedEmployeeId || null,
          environment: input.environment || "Staging",
          status: QATestCycleStatus.PLANNED,
          createdById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: input.projectId },
        data: {
          qaCompletedAt: null,
          qaCompletedById: null,
          qaWorkRequirement: QARequirementStatus.IN_PROGRESS,
        },
      });

      return created;
    });

    await logItemCreated("ProjectQATestCycle", testCycle.id, `Created test cycle: ${testCycle.name}`);
    await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);

    return { success: true, testCycle };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create QA Test Cycle";
    console.error("createQATestCycle error:", error);
    return { success: false, error: msg };
  }
}

export async function updateQATestCycle(input: {
  testCycleId: string;
  name?: string;
  type?: QATestCycleType;
  buildRecordId?: string | null;
  assignedEmployeeId?: string | null;
  status?: QATestCycleStatus;
  environment?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const current = await prisma.projectQATestCycle.findUnique({ where: { id: input.testCycleId } });
    if (!current) return { success: false, error: "QA Test Cycle not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(current.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const targetEmpId = input.assignedEmployeeId !== undefined ? input.assignedEmployeeId : current.assignedEmployeeId;

    if (targetEmpId) {
      const employee = await prisma.employee.findUnique({
        where: { id: targetEmpId },
        include: {
          DepartmentRef: { select: { name: true, code: true, capabilities: true } },
          TeamRef: { select: { name: true, code: true, capabilities: true } },
        },
      });

      if (!employee || employee.organizationId !== current.organizationId) {
        return { success: false, error: "Selected QA engineer does not belong to your organization." };
      }

      if (employee.status !== "active") {
        return { success: false, error: `Cannot assign inactive employee (Status: ${employee.status}).` };
      }

      const validAlloc = await prisma.projectResourceAllocation.findFirst({
        where: {
          projectId: current.projectId,
          employeeId: targetEmpId,
          status: { in: [AllocationStatus.PLANNED, AllocationStatus.ACTIVE] },
        },
        include: {
          Department: { select: { name: true, code: true, capabilities: true } },
          Team: { select: { name: true, code: true, capabilities: true } },
        },
      });

      if (!validAlloc) {
        return {
          success: false,
          error: "Phase 10 Resource Allocation Gate: Selected QA engineer has no active or planned Resource Allocation on this Project.",
        };
      }

      const allocQualifies = isQAQualifiedAllocation({ ...validAlloc, Employee: employee });

      if (!allocQualifies) {
        return {
          success: false,
          error: `Phase 14 Capability Gate: Employee '${employee.name}' is not assigned to a canonical QA-capable department/team with 'QA_EXECUTION' capability.`,
        };
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectQATestCycle.update({
        where: { id: input.testCycleId },
        data: {
          name: input.name !== undefined ? input.name : current.name,
          type: input.type !== undefined ? input.type : current.type,
          buildRecordId: input.buildRecordId !== undefined ? input.buildRecordId : current.buildRecordId,
          assignedEmployeeId: targetEmpId,
          status: input.status !== undefined ? input.status : current.status,
          environment: input.environment !== undefined ? input.environment : current.environment,
          updatedById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: current.projectId },
        data: {
          qaCompletedAt: null,
          qaCompletedById: null,
        },
      });

      return res;
    });

    await logItemUpdated("ProjectQATestCycle", updated.id, `Updated test cycle: ${updated.name}`);
    await revalidateBothPaths(`/dashboard/projects/${current.projectId}`);

    return { success: true, testCycle: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update QA Test Cycle";
    console.error("updateQATestCycle error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 5. TEST CASE & EXECUTION RECORDING
// ---------------------------------------------------------------------------

export async function createOrUpdateTestCase(input: {
  projectId: string;
  testCaseId?: string;
  qaPlanId?: string;
  taskId?: string;
  title: string;
  description?: string;
  preconditions?: string;
  expectedResult?: string;
  priority?: QATestCasePriority;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", input.testCaseId ? "edit" : "create");

    if (input.testCaseId) {
      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.qATestCase.update({
          where: { id: input.testCaseId },
          data: {
            title: input.title,
            description: input.description || null,
            preconditions: input.preconditions || null,
            expectedResult: input.expectedResult || null,
            priority: input.priority || QATestCasePriority.MEDIUM,
            qaPlanId: input.qaPlanId || null,
            taskId: input.taskId || null,
            updatedById: session.user.id,
          },
        });

        await tx.project.update({
          where: { id: input.projectId },
          data: { qaCompletedAt: null, qaCompletedById: null },
        });

        return res;
      });

      await logItemUpdated("QATestCase", updated.id, `Updated test case: ${updated.title}`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, testCase: updated };
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const res = await tx.qATestCase.create({
          data: {
            organizationId: project.organizationId,
            projectId: input.projectId,
            qaPlanId: input.qaPlanId || null,
            taskId: input.taskId || null,
            title: input.title,
            description: input.description || null,
            preconditions: input.preconditions || null,
            expectedResult: input.expectedResult || null,
            priority: input.priority || QATestCasePriority.MEDIUM,
            createdById: session.user.id,
          },
        });

        await tx.project.update({
          where: { id: input.projectId },
          data: { qaCompletedAt: null, qaCompletedById: null },
        });

        return res;
      });

      await logItemCreated("QATestCase", created.id, `Created test case: ${created.title}`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, testCase: created };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save QA Test Case";
    console.error("createOrUpdateTestCase error:", error);
    return { success: false, error: msg };
  }
}

export async function recordTestExecution(input: {
  testCaseId: string;
  testCycleId: string;
  buildRecordId?: string;
  executedByEmployeeId?: string;
  status: QATestExecutionStatus;
  actualResult?: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const testCase = await prisma.qATestCase.findUnique({ where: { id: input.testCaseId } });
    if (!testCase) return { success: false, error: "Test Case not found" };

    const testCycle = await prisma.projectQATestCycle.findUnique({ where: { id: input.testCycleId } });
    if (!testCycle) return { success: false, error: "Test Cycle not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(testCase.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const execution = await prisma.$transaction(async (tx) => {
      // Row lock parent QATestCase for concurrent sequence allocation safety
      await tx.$executeRawUnsafe(
        `SELECT id FROM "QATestCase" WHERE id = $1 FOR UPDATE`,
        input.testCaseId
      );

      const maxSeq = await tx.qATestExecution.aggregate({
        where: { testCaseId: input.testCaseId, testCycleId: input.testCycleId },
        _max: { executionSequence: true },
      });
      const nextSeq = (maxSeq._max.executionSequence || 0) + 1;

      const res = await tx.qATestExecution.create({
        data: {
          organizationId: testCase.organizationId,
          testCaseId: input.testCaseId,
          testCycleId: input.testCycleId,
          executionSequence: nextSeq,
          buildRecordId: input.buildRecordId || testCycle.buildRecordId || null,
          executedByEmployeeId: input.executedByEmployeeId || testCycle.assignedEmployeeId || null,
          status: input.status,
          actualResult: input.actualResult || null,
          notes: input.notes || null,
          createdById: session.user.id,
        },
      });

      if (input.status === QATestExecutionStatus.FAILED || input.status === QATestExecutionStatus.BLOCKED) {
        await tx.project.update({
          where: { id: testCase.projectId },
          data: {
            qaCompletedAt: null,
            qaCompletedById: null,
          },
        });
      }

      return res;
    });

    await logItemCreated("QATestExecution", execution.id, `Recorded test execution (${execution.status}) for test case '${testCase.title}'`);
    await revalidateBothPaths(`/dashboard/projects/${testCase.projectId}`);

    return { success: true, execution };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record test execution";
    console.error("recordTestExecution error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 6. COMPLETE TEST CYCLE & HANDOFF READY
// ---------------------------------------------------------------------------

export async function completeQATestCycle(testCycleId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const testCycle = await prisma.projectQATestCycle.findUnique({
      where: { id: testCycleId },
      include: { BuildRecord: true },
    });

    if (!testCycle) return { success: false, error: "Test Cycle not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(testCycle.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    if (testCycle.status === QATestCycleStatus.COMPLETED) {
      return { success: true, testCycle, idempotent: true };
    }

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "ProjectQATestCycle" WHERE id = $1 FOR UPDATE`,
        testCycleId
      );

      const fresh = await tx.projectQATestCycle.findUnique({ where: { id: testCycleId } });
      if (!fresh) throw new Error("Test Cycle not found");

      if (fresh.status === QATestCycleStatus.COMPLETED) {
        return { testCycle: fresh, idempotent: true, logical: false };
      }

      isLogicalTransition = true;

      const updated = await tx.projectQATestCycle.update({
        where: { id: testCycleId },
        data: {
          status: QATestCycleStatus.COMPLETED,
          completedAt: new Date(),
          updatedById: session.user.id,
        },
      });

      return { testCycle: updated, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("ProjectQATestCycle", result.testCycle.id, "Completed QA Test Cycle");
      await revalidateBothPaths(`/dashboard/projects/${testCycle.projectId}`);
    }

    return { success: true, testCycle: result.testCycle, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to complete QA Test Cycle";
    console.error("completeQATestCycle error:", error);
    return { success: false, error: msg };
  }
}

export async function markQAHandoffReady(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "approve");

    if (project.qaCompletedAt != null) {
      return { success: true, project, idempotent: true };
    }

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "Project" WHERE id = $1 FOR UPDATE`,
        projectId
      );

      const freshPrj = await tx.project.findUnique({ where: { id: projectId } });
      if (!freshPrj) throw new Error("Project not found");

      if (freshPrj.qaCompletedAt != null) {
        return { project: freshPrj, idempotent: true, logical: false };
      }

      const val = await validateQACompletionEligibility(projectId, tx);
      if (!val.eligible) {
        throw new Error(`QA Completion Blocked: ${val.error}`);
      }

      isLogicalTransition = true;

      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          qaCompletedAt: new Date(),
          qaCompletedById: session.user.id,
          qaWorkRequirement: QARequirementStatus.COMPLETED,
        },
      });

      return { project: updated, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("Project", result.project.id, "Marked QA HANDOFF READY (UAT Readiness Passed)");
      await revalidateBothPaths(`/dashboard/projects/${projectId}`);
    }

    return { success: true, project: result.project, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark QA handoff ready";
    console.error("markQAHandoffReady error:", error);
    return { success: false, error: msg };
  }
}

export async function reopenQATestCycle(testCycleId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const testCycle = await prisma.projectQATestCycle.findUnique({ where: { id: testCycleId } });
    if (!testCycle) return { success: false, error: "QA Test Cycle not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(testCycle.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectQATestCycle.update({
        where: { id: testCycleId },
        data: {
          status: QATestCycleStatus.IN_PROGRESS,
          completedAt: null,
        },
      });

      // DOWNSTREAM INVALIDATION: Clear QA completion timestamp atomically
      await tx.project.update({
        where: { id: testCycle.projectId },
        data: {
          qaCompletedAt: null,
          qaCompletedById: null,
          qaWorkRequirement: QARequirementStatus.IN_PROGRESS,
        },
      });

      return res;
    });

    await logItemUpdated("ProjectQATestCycle", updated.id, "Reopened QA Test Cycle — UAT Handoff readiness invalidated");
    await revalidateBothPaths(`/dashboard/projects/${testCycle.projectId}`);

    return { success: true, testCycle: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reopen QA Test Cycle";
    console.error("reopenQATestCycle error:", error);
    return { success: false, error: msg };
  }
}
