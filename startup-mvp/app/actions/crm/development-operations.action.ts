"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { validateCreativeCompletionEligibility } from "@/app/actions/crm/creative-operations.action";
import { validateMarketingCompletionEligibility } from "@/app/actions/crm/marketing-operations.action";
import {
  DevelopmentRequirementStatus,
  DevelopmentPlanStatus,
  DevelopmentWorkstreamType,
  DevelopmentWorkstreamStatus,
  CodeReviewStatus,
  BuildStatus,
  ProjectStatus,
  AllocationStatus,
  CreativeRequirementStatus,
  MarketingRequirementStatus,
  IssueStatus,
  Prisma,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// TENANT-CONFIGURABLE DEVELOPMENT CAPABILITY POLICY (Phase 13 Isolated)
// ---------------------------------------------------------------------------

const DEVELOPMENT_CAPABILITY_KEY = "DEVELOPMENT_EXECUTION";
const CREATIVE_CAPABILITY_KEY = "CREATIVE_EXECUTION";
const MARKETING_CAPABILITY_KEY = "MARKETING_EXECUTION";

export async function isDevelopmentQualifiedEmployee(employee: {
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
    if (teamCaps.includes(DEVELOPMENT_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 2. CANONICAL DEPARTMENT CHECK
  if (employee.DepartmentRef) {
    const deptCaps = employee.DepartmentRef.capabilities || [];
    if (deptCaps.includes(DEVELOPMENT_CAPABILITY_KEY)) {
      return true;
    }
  }

  // ABSOLUTE RULE: Zero text fallback!
  return false;
}

export async function isDevelopmentQualifiedAllocation(allocation: {
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
    if (teamCaps.includes(DEVELOPMENT_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 2. CANONICAL DEPARTMENT CAPABILITY CHECK
  if (allocation.Department) {
    const deptCaps = allocation.Department.capabilities || [];
    if (deptCaps.includes(DEVELOPMENT_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 3. EMPLOYEE CANONICAL CAPABILITY CHECK
  if (allocation.Employee) {
    return await isDevelopmentQualifiedEmployee(allocation.Employee);
  }

  return false;
}

// ---------------------------------------------------------------------------
// CANONICAL PROJECT DEPARTMENT DEPENDENCY RESOLVER (Phase 13D Unified)
// ---------------------------------------------------------------------------

export async function getProjectExecutionDependencies(
  projectId: string,
  txClient?: Prisma.TransactionClient
) {
  const db = txClient || prisma;
  const deps = await db.projectDepartmentDependency.findMany({
    where: { projectId, required: true },
  });

  const hasMarketingPrerequisite = deps.some(
    (d) => d.upstreamCapability === MARKETING_CAPABILITY_KEY && d.downstreamCapability === DEVELOPMENT_CAPABILITY_KEY
  );

  const hasCreativePrerequisite = deps.some(
    (d) => d.upstreamCapability === CREATIVE_CAPABILITY_KEY && d.downstreamCapability === DEVELOPMENT_CAPABILITY_KEY
  );

  return {
    deps,
    hasMarketingPrerequisite,
    hasCreativePrerequisite,
  };
}

// ---------------------------------------------------------------------------
// AUTHORITATIVE DEVELOPMENT READINESS VALIDATOR (Phase 13D Unified)
// ---------------------------------------------------------------------------

export async function validateDevelopmentReadinessEligibility(
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
    return { eligible: false, error: `Cannot mark '${project.status}' project ready for Development Execution.` };
  }

  if (!project.resourcePlanningReadyAt) {
    return {
      eligible: false,
      error: "Business Gate Blocked: Project must pass Phase 9 Resource Planning Readiness gate before Development Execution.",
    };
  }

  // Load CANONICAL PERSISTED DEPENDENCY TRUTH (Phase 13D: ONLY stored ProjectDepartmentDependency records govern ordering!)
  const { hasMarketingPrerequisite, hasCreativePrerequisite } = await getProjectExecutionDependencies(projectId, db);

  // 1. Upstream Creative Dependency Matrix (CD1–CD7 & Parallel Creative Matrix)
  // Creative blocks ONLY if explicitly configured as a stored prerequisite in ProjectDepartmentDependency!
  if (hasCreativePrerequisite) {
    if (project.creativeWorkRequirement !== CreativeRequirementStatus.COMPLETED || !project.creativeCompletedAt) {
      return {
        eligible: false,
        error: `Business Gate Blocked: Upstream Creative work is a Development prerequisite in state '${project.creativeWorkRequirement}' but Phase 11 Creative completion is absent.`,
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

  // 2. Upstream Marketing Dependency Policy (MD1–MD8 & Parallel Marketing Matrix)
  // Marketing blocks ONLY if explicitly configured as a stored prerequisite in ProjectDepartmentDependency!
  if (hasMarketingPrerequisite) {
    if (project.marketingWorkRequirement !== MarketingRequirementStatus.COMPLETED || !project.marketingCompletedAt) {
      return {
        eligible: false,
        error: `Business Gate Blocked: Upstream Marketing work is a Development prerequisite in state '${project.marketingWorkRequirement}' but Phase 12 Marketing completion is absent.`,
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

  // 3. DEVELOPMENT_EXECUTION Capability-backed Allocation Check
  const qualifyingAllocations = [];
  for (const a of project.ResourceAllocations) {
    if (await isDevelopmentQualifiedAllocation(a)) {
      qualifyingAllocations.push(a);
    }
  }

  if (qualifyingAllocations.length === 0) {
    return {
      eligible: false,
      error: "Business Gate Blocked: Project has no qualifying Development resource allocations with 'DEVELOPMENT_EXECUTION' capability.",
    };
  }

  return { eligible: true, project };
}

// ---------------------------------------------------------------------------
// AUTHORITATIVE DEVELOPMENT COMPLETION VALIDATOR (Phase 13D Unified)
// ---------------------------------------------------------------------------

export async function validateDevelopmentCompletionEligibility(
  projectId: string,
  txClient?: Prisma.TransactionClient
) {
  const db = txClient || prisma;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      DevelopmentWorkstreams: {
        include: {
          Task: { select: { id: true, title: true, status: true } },
          BuildRecords: { orderBy: { recordedAt: "desc" }, take: 1 },
          TechnicalDeliverables: { select: { id: true, title: true, status: true, codeReviewStatus: true } },
        },
      },
      DevelopmentPlans: { select: { id: true, status: true } },
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

  if (project.developmentWorkRequirement === DevelopmentRequirementStatus.NOT_REQUIRED) {
    return { eligible: false, error: "Software Development is not required for this Project." };
  }

  if (!project.developmentExecutionReadyAt) {
    return { eligible: false, error: "Project has not passed Development Execution Readiness gate." };
  }

  if (project.DevelopmentWorkstreams.length === 0 && project.DevelopmentPlans.length === 0) {
    return { eligible: false, error: "Project must have at least one Development Plan or Workstream." };
  }

  // Load CANONICAL PERSISTED DEPENDENCY TRUTH
  const { hasMarketingPrerequisite, hasCreativePrerequisite } = await getProjectExecutionDependencies(projectId, db);

  // 1. Upstream Creative Dependency Gate (Phase 13D Unified Semantics)
  if (hasCreativePrerequisite) {
    if (project.creativeWorkRequirement !== CreativeRequirementStatus.COMPLETED || !project.creativeCompletedAt) {
      return { eligible: false, error: "Cannot complete Development: Upstream Creative completion is required as a prerequisite but incomplete." };
    }
    const creativeVal = await validateCreativeCompletionEligibility(projectId);
    if (!creativeVal.eligible) {
      return { eligible: false, error: `Cannot complete Development: Upstream Creative completion is stale/invalid (${creativeVal.reason}).` };
    }
  }

  // 2. Upstream Marketing Dependency Gate (Phase 13D Unified Semantics)
  if (hasMarketingPrerequisite) {
    if (project.marketingWorkRequirement !== MarketingRequirementStatus.COMPLETED || !project.marketingCompletedAt) {
      return { eligible: false, error: "Cannot complete Development: Upstream Marketing completion is required as a prerequisite but incomplete." };
    }
    const mktVal = await validateMarketingCompletionEligibility(projectId, db);
    if (!mktVal.eligible) {
      return { eligible: false, error: `Cannot complete Development: Upstream Marketing completion is stale/invalid (${mktVal.error}).` };
    }
  }

  // 3. Mandatory Workstream Completion Gate
  const uncompletedWorkstreams = project.DevelopmentWorkstreams.filter(
    (w) => w.status !== DevelopmentWorkstreamStatus.COMPLETED
  );
  if (uncompletedWorkstreams.length > 0) {
    return {
      eligible: false,
      error: `Cannot complete Development: ${uncompletedWorkstreams.length} workstream(s) are not yet COMPLETED (e.g. '${uncompletedWorkstreams[0].name}').`,
    };
  }

  // 4. Linked Task Completion Gate
  for (const ws of project.DevelopmentWorkstreams) {
    if (ws.Task && ws.Task.status !== "COMPLETED") {
      return {
        eligible: false,
        error: `Cannot complete Development: Linked task '${ws.Task.title}' for workstream '${ws.name}' is in status '${ws.Task.status}' (must be COMPLETED).`,
      };
    }
  }

  // 5. Code Review Approval Gate
  for (const ws of project.DevelopmentWorkstreams) {
    if (ws.codeReviewStatus === CodeReviewStatus.PENDING || ws.codeReviewStatus === CodeReviewStatus.CHANGES_REQUESTED) {
      return {
        eligible: false,
        error: `Cannot complete Development: Workstream '${ws.name}' code review is in status '${ws.codeReviewStatus}' (must be APPROVED or NOT_REQUIRED).`,
      };
    }
  }

  // 6. Build Status Gate (B1–B6)
  for (const ws of project.DevelopmentWorkstreams) {
    if (ws.BuildRecords.length > 0) {
      const latestBuild = ws.BuildRecords[0];
      if (latestBuild.status !== BuildStatus.PASSED) {
        return {
          eligible: false,
          error: `Cannot complete Development: Latest build #${latestBuild.buildNumber} for workstream '${ws.name}' is in status '${latestBuild.status}' (must be PASSED).`,
        };
      }
    }
  }

  // 7. Canonical Blocking Issue Gate (I1–I8)
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
      error: `Cannot complete Development: ${unresolvedBlockers.length} unresolved blocking issue(s) remain open (e.g. '${unresolvedBlockers[0].title}').`,
    };
  }

  return { eligible: true, project };
}

// ---------------------------------------------------------------------------
// PROJECT DEPARTMENT DEPENDENCY MANAGEMENT ACTIONS (Phase 13D)
// ---------------------------------------------------------------------------

export async function addProjectDepartmentDependency(input: {
  projectId: string;
  upstreamCapability: string;
  downstreamCapability: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (input.upstreamCapability === input.downstreamCapability) {
      return { success: false, error: "Self dependency is not allowed." };
    }

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const dep = await prisma.$transaction(async (tx) => {
      const created = await tx.projectDepartmentDependency.upsert({
        where: {
          projectId_upstreamCapability_downstreamCapability: {
            projectId: input.projectId,
            upstreamCapability: input.upstreamCapability,
            downstreamCapability: input.downstreamCapability,
          },
        },
        create: {
          organizationId: project.organizationId,
          projectId: input.projectId,
          upstreamCapability: input.upstreamCapability,
          downstreamCapability: input.downstreamCapability,
          required: true,
          createdById: session.user.id,
        },
        update: {
          required: true,
        },
      });

      // DEPENDENCY CHANGE INVALIDATION: If downstream is DEVELOPMENT_EXECUTION and new upstream dependency is incomplete, clear readiness & completion
      if (input.downstreamCapability === DEVELOPMENT_CAPABILITY_KEY) {
        let upstreamIncomplete = false;
        if (input.upstreamCapability === MARKETING_CAPABILITY_KEY && (!project.marketingCompletedAt || project.marketingWorkRequirement !== MarketingRequirementStatus.COMPLETED)) {
          upstreamIncomplete = true;
        } else if (input.upstreamCapability === CREATIVE_CAPABILITY_KEY && (!project.creativeCompletedAt || project.creativeWorkRequirement !== CreativeRequirementStatus.COMPLETED)) {
          upstreamIncomplete = true;
        }

        if (upstreamIncomplete) {
          await tx.project.update({
            where: { id: input.projectId },
            data: {
              developmentExecutionReadyAt: null,
              developmentExecutionReadyById: null,
              developmentCompletedAt: null,
              developmentCompletedById: null,
            },
          });
        }
      }

      return created;
    });

    await logItemCreated("ProjectDepartmentDependency", dep.id, `Added dependency ${input.upstreamCapability} -> ${input.downstreamCapability}`);
    await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);

    return { success: true, dependency: dep };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add project department dependency";
    console.error("addProjectDepartmentDependency error:", error);
    return { success: false, error: msg };
  }
}

export async function removeProjectDepartmentDependency(input: {
  projectId: string;
  dependencyId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const dep = await prisma.projectDepartmentDependency.findUnique({ where: { id: input.dependencyId } });
    if (!dep || dep.projectId !== input.projectId) {
      return { success: false, error: "Dependency record not found" };
    }

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(dep.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    await prisma.projectDepartmentDependency.delete({ where: { id: input.dependencyId } });

    await logItemDeleted("ProjectDepartmentDependency", input.dependencyId, `Removed dependency ${dep.upstreamCapability} -> ${dep.downstreamCapability}`);
    await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to remove project department dependency";
    console.error("removeProjectDepartmentDependency error:", error);
    return { success: false, error: msg };
  }
}

export async function getProjectDepartmentDependencies(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const dependencies = await prisma.projectDepartmentDependency.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, dependencies };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch project department dependencies";
    console.error("getProjectDepartmentDependencies error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 1. SET DEVELOPMENT REQUIREMENT & MARK READY FOR DEVELOPMENT EXECUTION
// ---------------------------------------------------------------------------

export async function setProjectDevelopmentRequirement(projectId: string, requirement: DevelopmentRequirementStatus) {
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
      data: { developmentWorkRequirement: requirement },
    });

    await logItemUpdated("Project", updated.id, `Set Development Requirement to '${requirement}'`);
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);
    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to set Development requirement";
    console.error("setProjectDevelopmentRequirement error:", error);
    return { success: false, error: msg };
  }
}

export async function markProjectReadyForDevelopmentExecution(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    // Authoritative Readiness Validation (Reads stored ProjectDepartmentDependency records!)
    const readinessVal = await validateDevelopmentReadinessEligibility(projectId);
    if (!readinessVal.eligible) {
      return { success: false, error: readinessVal.error };
    }

    const now = new Date();
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        developmentExecutionReadyAt: now,
        developmentExecutionReadyById: session.user.id,
        developmentWorkRequirement: DevelopmentRequirementStatus.READY,
      },
    });

    await logItemUpdated("Project", updated.id, "Marked READY FOR DEVELOPMENT EXECUTION");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark project ready for Development execution";
    console.error("markProjectReadyForDevelopmentExecution error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 2. GET PROJECT DEVELOPMENT OPERATIONS
// ---------------------------------------------------------------------------

export async function getProjectDevelopmentOperations(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const plans = await prisma.projectDevelopmentPlan.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        CreatedBy: { select: { id: true, name: true, email: true } },
        Workstreams: true,
      },
    });

    const workstreams = await prisma.projectDevelopmentWorkstream.findMany({
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
        Task: { select: { id: true, title: true, status: true, priority: true } },
        CreatedBy: { select: { id: true, name: true, email: true } },
        TechnicalDeliverables: { orderBy: { createdAt: "desc" } },
        BuildRecords: { orderBy: { recordedAt: "desc" }, include: { CreatedBy: { select: { id: true, name: true, email: true } } } },
      },
    });

    const dependencies = await prisma.projectDepartmentDependency.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      developmentExecutionReadyAt: project.developmentExecutionReadyAt,
      developmentExecutionReadyById: project.developmentExecutionReadyById,
      developmentWorkRequirement: project.developmentWorkRequirement,
      developmentCompletedAt: project.developmentCompletedAt,
      developmentCompletedById: project.developmentCompletedById,
      plans,
      workstreams,
      dependencies,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch Development operations";
    console.error("getProjectDevelopmentOperations error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3. CREATE OR UPDATE DEVELOPMENT PLAN
// ---------------------------------------------------------------------------

export async function createOrUpdateDevelopmentPlan(input: {
  projectId: string;
  planId?: string;
  title: string;
  architectureNotes?: string;
  technicalScope?: string;
  frontendRequired?: boolean;
  backendRequired?: boolean;
  mobileRequired?: boolean;
  apiRequired?: boolean;
  databaseRequired?: boolean;
  integrationRequired?: boolean;
  environmentNotes?: string;
  repositoryProvider?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  branchStrategy?: string;
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

    if (!project.developmentExecutionReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must be marked READY FOR DEVELOPMENT EXECUTION before creating a Development Plan.",
      };
    }

    const start = input.startDate ? new Date(input.startDate) : null;
    const end = input.targetEndDate ? new Date(input.targetEndDate) : null;

    if (input.planId) {
      const existing = await prisma.projectDevelopmentPlan.findUnique({ where: { id: input.planId } });
      if (!existing || existing.organizationId !== project.organizationId) {
        return { success: false, error: "Development Plan not found" };
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.projectDevelopmentPlan.update({
          where: { id: input.planId },
          data: {
            title: input.title,
            architectureNotes: input.architectureNotes || null,
            technicalScope: input.technicalScope || null,
            frontendRequired: input.frontendRequired !== undefined ? input.frontendRequired : true,
            backendRequired: input.backendRequired !== undefined ? input.backendRequired : true,
            mobileRequired: input.mobileRequired !== undefined ? input.mobileRequired : false,
            apiRequired: input.apiRequired !== undefined ? input.apiRequired : true,
            databaseRequired: input.databaseRequired !== undefined ? input.databaseRequired : true,
            integrationRequired: input.integrationRequired !== undefined ? input.integrationRequired : false,
            environmentNotes: input.environmentNotes || null,
            repositoryProvider: input.repositoryProvider || null,
            repositoryName: input.repositoryName || null,
            repositoryUrl: input.repositoryUrl || null,
            branchStrategy: input.branchStrategy || null,
            startDate: start,
            targetEndDate: end,
            updatedById: session.user.id,
          },
        });

        // DOWNSTREAM INVALIDATION
        await tx.project.update({
          where: { id: input.projectId },
          data: {
            developmentCompletedAt: null,
            developmentCompletedById: null,
            developmentWorkRequirement: DevelopmentRequirementStatus.IN_PROGRESS,
          },
        });

        return res;
      });

      await logItemUpdated("ProjectDevelopmentPlan", updated.id, `Updated development plan: ${updated.title}`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, plan: updated };
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const res = await tx.projectDevelopmentPlan.create({
          data: {
            organizationId: project.organizationId,
            projectId: input.projectId,
            title: input.title,
            architectureNotes: input.architectureNotes || null,
            technicalScope: input.technicalScope || null,
            frontendRequired: input.frontendRequired !== undefined ? input.frontendRequired : true,
            backendRequired: input.backendRequired !== undefined ? input.backendRequired : true,
            mobileRequired: input.mobileRequired !== undefined ? input.mobileRequired : false,
            apiRequired: input.apiRequired !== undefined ? input.apiRequired : true,
            databaseRequired: input.databaseRequired !== undefined ? input.databaseRequired : true,
            integrationRequired: input.integrationRequired !== undefined ? input.integrationRequired : false,
            environmentNotes: input.environmentNotes || null,
            repositoryProvider: input.repositoryProvider || null,
            repositoryName: input.repositoryName || null,
            repositoryUrl: input.repositoryUrl || null,
            branchStrategy: input.branchStrategy || null,
            startDate: start,
            targetEndDate: end,
            status: DevelopmentPlanStatus.DRAFT,
            createdById: session.user.id,
          },
        });

        await tx.project.update({
          where: { id: input.projectId },
          data: { developmentWorkRequirement: DevelopmentRequirementStatus.IN_PROGRESS },
        });

        return res;
      });

      await logItemCreated("ProjectDevelopmentPlan", created.id, `Created development plan: ${created.title}`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, plan: created };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save Development Plan";
    console.error("createOrUpdateDevelopmentPlan error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 4. CREATE & UPDATE DEVELOPMENT WORKSTREAM
// ---------------------------------------------------------------------------

export async function createDevelopmentWorkstream(input: {
  projectId: string;
  developmentPlanId?: string;
  name: string;
  type?: DevelopmentWorkstreamType;
  assignedEmployeeId?: string;
  taskId?: string;
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
    await verifyServerPermission(session.user.id, "projects", "create");

    if (!project.developmentExecutionReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must be marked READY FOR DEVELOPMENT EXECUTION before creating Development Workstreams.",
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
        return { success: false, error: "Selected developer does not belong to your organization." };
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
          error: "Phase 10 Resource Allocation Gate: Selected developer has no active or planned Resource Allocation on this Project.",
        };
      }

      const allocQualifies = isDevelopmentQualifiedAllocation({ ...validAlloc, Employee: employee });

      if (!allocQualifies) {
        return {
          success: false,
          error: `Phase 13 Capability Gate: Employee '${employee.name}' is not assigned to a canonical Development-capable department/team with 'DEVELOPMENT_EXECUTION' capability.`,
        };
      }
    }

    const start = input.startDate ? new Date(input.startDate) : null;
    const end = input.targetEndDate ? new Date(input.targetEndDate) : null;

    const workstream = await prisma.$transaction(async (tx) => {
      const created = await tx.projectDevelopmentWorkstream.create({
        data: {
          organizationId: project.organizationId,
          projectId: input.projectId,
          developmentPlanId: input.developmentPlanId || null,
          name: input.name,
          type: input.type || DevelopmentWorkstreamType.BACKEND,
          assignedEmployeeId: input.assignedEmployeeId || null,
          taskId: input.taskId || null,
          startDate: start,
          targetEndDate: end,
          status: DevelopmentWorkstreamStatus.DRAFT,
          codeReviewStatus: CodeReviewStatus.NOT_REQUIRED,
          createdById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: input.projectId },
        data: {
          developmentCompletedAt: null,
          developmentCompletedById: null,
          developmentWorkRequirement: DevelopmentRequirementStatus.IN_PROGRESS,
        },
      });

      return created;
    });

    await logItemCreated("ProjectDevelopmentWorkstream", workstream.id, `Created workstream: ${workstream.name}`);
    await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);

    return { success: true, workstream };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create Development Workstream";
    console.error("createDevelopmentWorkstream error:", error);
    return { success: false, error: msg };
  }
}

export async function updateDevelopmentWorkstream(input: {
  workstreamId: string;
  name?: string;
  type?: DevelopmentWorkstreamType;
  assignedEmployeeId?: string | null;
  taskId?: string | null;
  status?: DevelopmentWorkstreamStatus;
  codeReviewStatus?: CodeReviewStatus;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const current = await prisma.projectDevelopmentWorkstream.findUnique({ where: { id: input.workstreamId } });
    if (!current) return { success: false, error: "Development Workstream not found" };

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
        return { success: false, error: "Selected developer does not belong to your organization." };
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
          error: "Phase 10 Resource Allocation Gate: Selected developer has no active or planned Resource Allocation on this Project.",
        };
      }

      const allocQualifies = isDevelopmentQualifiedAllocation({ ...validAlloc, Employee: employee });

      if (!allocQualifies) {
        return {
          success: false,
          error: `Phase 13 Capability Gate: Employee '${employee.name}' is not assigned to a canonical Development-capable department/team with 'DEVELOPMENT_EXECUTION' capability.`,
        };
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectDevelopmentWorkstream.update({
        where: { id: input.workstreamId },
        data: {
          name: input.name !== undefined ? input.name : current.name,
          type: input.type !== undefined ? input.type : current.type,
          assignedEmployeeId: targetEmpId,
          taskId: input.taskId !== undefined ? input.taskId : current.taskId,
          status: input.status !== undefined ? input.status : current.status,
          codeReviewStatus: input.codeReviewStatus !== undefined ? input.codeReviewStatus : current.codeReviewStatus,
          updatedById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: current.projectId },
        data: {
          developmentCompletedAt: null,
          developmentCompletedById: null,
        },
      });

      return res;
    });

    await logItemUpdated("ProjectDevelopmentWorkstream", updated.id, `Updated workstream: ${updated.name}`);
    await revalidateBothPaths(`/dashboard/projects/${current.projectId}`);

    return { success: true, workstream: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update Development Workstream";
    console.error("updateDevelopmentWorkstream error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 5. CODE REVIEW WORKFLOW & BUILD RECORDING
// ---------------------------------------------------------------------------

export async function submitCodeReview(workstreamId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const workstream = await prisma.projectDevelopmentWorkstream.findUnique({ where: { id: workstreamId } });
    if (!workstream) return { success: false, error: "Workstream not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(workstream.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const updated = await prisma.projectDevelopmentWorkstream.update({
      where: { id: workstreamId },
      data: {
        codeReviewStatus: CodeReviewStatus.PENDING,
        status: DevelopmentWorkstreamStatus.CODE_REVIEW,
        updatedById: session.user.id,
      },
    });

    await logItemUpdated("ProjectDevelopmentWorkstream", updated.id, "Submitted Code Review");
    await revalidateBothPaths(`/dashboard/projects/${workstream.projectId}`);

    return { success: true, workstream: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to submit code review";
    console.error("submitCodeReview error:", error);
    return { success: false, error: msg };
  }
}

export async function reviewCodeReview(input: {
  workstreamId: string;
  action: "APPROVE" | "REQUEST_CHANGES";
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const workstream = await prisma.projectDevelopmentWorkstream.findUnique({ where: { id: input.workstreamId } });
    if (!workstream) return { success: false, error: "Workstream not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(workstream.organizationId);
    await verifyServerPermission(session.user.id, "projects", "approve");

    const targetReview = input.action === "APPROVE" ? CodeReviewStatus.APPROVED : CodeReviewStatus.CHANGES_REQUESTED;
    const targetStatus = input.action === "APPROVE" ? DevelopmentWorkstreamStatus.IN_PROGRESS : DevelopmentWorkstreamStatus.IN_PROGRESS;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectDevelopmentWorkstream.update({
        where: { id: input.workstreamId },
        data: {
          codeReviewStatus: targetReview,
          status: targetStatus,
          updatedById: session.user.id,
        },
      });

      if (input.action === "REQUEST_CHANGES") {
        await tx.project.update({
          where: { id: workstream.projectId },
          data: {
            developmentCompletedAt: null,
            developmentCompletedById: null,
          },
        });
      }

      return res;
    });

    await logItemUpdated("ProjectDevelopmentWorkstream", updated.id, `Reviewed Code Review: ${input.action}`);
    await revalidateBothPaths(`/dashboard/projects/${workstream.projectId}`);

    return { success: true, workstream: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to review code review";
    console.error("reviewCodeReview error:", error);
    return { success: false, error: msg };
  }
}

export async function recordBuildStatus(input: {
  workstreamId: string;
  buildNumber: string;
  environment?: string;
  status: BuildStatus;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const workstream = await prisma.projectDevelopmentWorkstream.findUnique({ where: { id: input.workstreamId } });
    if (!workstream) return { success: false, error: "Workstream not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(workstream.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const build = await prisma.developmentBuildRecord.create({
      data: {
        organizationId: workstream.organizationId,
        workstreamId: input.workstreamId,
        buildNumber: input.buildNumber,
        environment: input.environment || "Staging",
        status: input.status,
        notes: input.notes || null,
        createdById: session.user.id,
      },
    });

    if (input.status === BuildStatus.FAILED) {
      await prisma.project.update({
        where: { id: workstream.projectId },
        data: {
          developmentCompletedAt: null,
          developmentCompletedById: null,
        },
      });
    }

    await logItemCreated("DevelopmentBuildRecord", build.id, `Recorded build #${build.buildNumber} (${build.status})`);
    await revalidateBothPaths(`/dashboard/projects/${workstream.projectId}`);

    return { success: true, build };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record build status";
    console.error("recordBuildStatus error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 6. COMPLETE WORKSTREAM & HANDOFF READY
// ---------------------------------------------------------------------------

export async function completeDevelopmentWorkstream(workstreamId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const workstream = await prisma.projectDevelopmentWorkstream.findUnique({
      where: { id: workstreamId },
      include: { Task: true, BuildRecords: { orderBy: { recordedAt: "desc" }, take: 1 } },
    });

    if (!workstream) return { success: false, error: "Workstream not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(workstream.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    if (workstream.Task && workstream.Task.status !== "COMPLETED") {
      return {
        success: false,
        error: `Cannot complete workstream '${workstream.name}': Linked task '${workstream.Task.title}' is not COMPLETED (Status: ${workstream.Task.status}).`,
      };
    }

    if (workstream.codeReviewStatus === CodeReviewStatus.PENDING || workstream.codeReviewStatus === CodeReviewStatus.CHANGES_REQUESTED) {
      return {
        success: false,
        error: `Cannot complete workstream '${workstream.name}': Code review is in status '${workstream.codeReviewStatus}' (must be APPROVED or NOT_REQUIRED).`,
      };
    }

    if (workstream.BuildRecords.length > 0 && workstream.BuildRecords[0].status !== BuildStatus.PASSED) {
      return {
        success: false,
        error: `Cannot complete workstream '${workstream.name}': Latest build status is ${workstream.BuildRecords[0].status} (must be PASSED).`,
      };
    }

    if (workstream.status === DevelopmentWorkstreamStatus.COMPLETED) {
      return { success: true, workstream, idempotent: true };
    }

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "ProjectDevelopmentWorkstream" WHERE id = $1 FOR UPDATE`,
        workstreamId
      );

      const fresh = await tx.projectDevelopmentWorkstream.findUnique({ where: { id: workstreamId } });
      if (!fresh) throw new Error("Workstream not found");

      if (fresh.status === DevelopmentWorkstreamStatus.COMPLETED) {
        return { workstream: fresh, idempotent: true, logical: false };
      }

      isLogicalTransition = true;

      const updated = await tx.projectDevelopmentWorkstream.update({
        where: { id: workstreamId },
        data: {
          status: DevelopmentWorkstreamStatus.COMPLETED,
          completedAt: new Date(),
          updatedById: session.user.id,
        },
      });

      return { workstream: updated, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("ProjectDevelopmentWorkstream", result.workstream.id, "Completed Development Workstream");
      await revalidateBothPaths(`/dashboard/projects/${workstream.projectId}`);
    }

    return { success: true, workstream: result.workstream, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to complete Development Workstream";
    console.error("completeDevelopmentWorkstream error:", error);
    return { success: false, error: msg };
  }
}

export async function markDevelopmentHandoffReady(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "approve");

    if (project.developmentCompletedAt != null) {
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

      if (freshPrj.developmentCompletedAt != null) {
        return { project: freshPrj, idempotent: true, logical: false };
      }

      const val = await validateDevelopmentCompletionEligibility(projectId, tx);
      if (!val.eligible) {
        throw new Error(`Development Completion Blocked: ${val.error}`);
      }

      isLogicalTransition = true;

      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          developmentCompletedAt: new Date(),
          developmentCompletedById: session.user.id,
          developmentWorkRequirement: DevelopmentRequirementStatus.COMPLETED,
        },
      });

      return { project: updated, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("Project", result.project.id, "Marked DEVELOPMENT HANDOFF READY (QA Handoff Ready)");
      await revalidateBothPaths(`/dashboard/projects/${projectId}`);
    }

    return { success: true, project: result.project, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark Development handoff ready";
    console.error("markDevelopmentHandoffReady error:", error);
    return { success: false, error: msg };
  }
}

export async function reopenDevelopmentWorkstream(workstreamId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const workstream = await prisma.projectDevelopmentWorkstream.findUnique({ where: { id: workstreamId } });
    if (!workstream) return { success: false, error: "Development Workstream not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(workstream.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectDevelopmentWorkstream.update({
        where: { id: workstreamId },
        data: {
          status: DevelopmentWorkstreamStatus.IN_PROGRESS,
          completedAt: null,
        },
      });

      // DOWNSTREAM INVALIDATION: Clear Development completion timestamp atomically
      await tx.project.update({
        where: { id: workstream.projectId },
        data: {
          developmentCompletedAt: null,
          developmentCompletedById: null,
          developmentWorkRequirement: DevelopmentRequirementStatus.IN_PROGRESS,
        },
      });

      return res;
    });

    await logItemUpdated("ProjectDevelopmentWorkstream", updated.id, "Reopened Development Workstream — QA Handoff readiness invalidated");
    await revalidateBothPaths(`/dashboard/projects/${workstream.projectId}`);

    return { success: true, campaign: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reopen Development Workstream";
    console.error("reopenDevelopmentWorkstream error:", error);
    return { success: false, error: msg };
  }
}
