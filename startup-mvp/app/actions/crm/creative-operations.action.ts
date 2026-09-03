"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import {
  CreativeRequirementStatus,
  CreativeBriefStatus,
  CreativeDeliverableType,
  CreativeDeliverableStatus,
  CreativeReviewStatus,
  ProjectStatus,
  AllocationStatus,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// TENANT-CONFIGURABLE CREATIVE CAPABILITY POLICY (Phase 11D Hardened — Zero Text Fallback)
// ---------------------------------------------------------------------------

const CREATIVE_CAPABILITY_KEY = "CREATIVE_EXECUTION";

export async function isCreativeQualifiedEmployee(employee: {
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
    if (teamCaps.includes(CREATIVE_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 2. CANONICAL DEPARTMENT CHECK (Takes precedence if present)
  if (employee.DepartmentRef) {
    const deptCaps = employee.DepartmentRef.capabilities || [];
    if (deptCaps.includes(CREATIVE_CAPABILITY_KEY)) {
      return true;
    }
  }

  // PHASE 11D ABSOLUTE RULE: Job titles, designations, free-text departments, and unit names NEVER grant Creative authority!
  return false;
}

export async function isCreativeQualifiedAllocation(allocation: {
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
    if (teamCaps.includes(CREATIVE_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 2. CANONICAL DEPARTMENT CAPABILITY CHECK
  if (allocation.Department) {
    const deptCaps = allocation.Department.capabilities || [];
    if (deptCaps.includes(CREATIVE_CAPABILITY_KEY)) {
      return true;
    }
  }

  // 3. EMPLOYEE CANONICAL CAPABILITY CHECK
  if (allocation.Employee) {
    return await isCreativeQualifiedEmployee(allocation.Employee);
  }

  return false;
}

// ---------------------------------------------------------------------------
// TENANT CAPABILITY CONFIGURATION SERVER ACTIONS
// ---------------------------------------------------------------------------

export async function toggleDepartmentCapability(
  departmentId: string,
  capability: string = CREATIVE_CAPABILITY_KEY,
  enable: boolean = true
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) return { success: false, error: "Department not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(dept.organizationId);
    await verifyServerPermission(session.user.id, "departments", "edit");

    let currentCaps = dept.capabilities || [];
    if (enable) {
      if (!currentCaps.includes(capability)) {
        currentCaps = [...currentCaps, capability];
      }
    } else {
      currentCaps = currentCaps.filter((c) => c !== capability);
    }

    const updated = await prisma.department.update({
      where: { id: departmentId },
      data: { capabilities: currentCaps },
    });

    await logItemUpdated("Department", updated.id, `${enable ? "Granted" : "Revoked"} capability '${capability}' on Department '${updated.name}'`);
    return { success: true, department: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to toggle Department capability";
    console.error("toggleDepartmentCapability error:", error);
    return { success: false, error: msg };
  }
}

export async function toggleTeamCapability(
  teamId: string,
  capability: string = CREATIVE_CAPABILITY_KEY,
  enable: boolean = true
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return { success: false, error: "Team not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(team.organizationId);
    await verifyServerPermission(session.user.id, "departments", "edit");

    let currentCaps = team.capabilities || [];
    if (enable) {
      if (!currentCaps.includes(capability)) {
        currentCaps = [...currentCaps, capability];
      }
    } else {
      currentCaps = currentCaps.filter((c) => c !== capability);
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { capabilities: currentCaps },
    });

    await logItemUpdated("Team", updated.id, `${enable ? "Granted" : "Revoked"} capability '${capability}' on Team '${updated.name}'`);
    return { success: true, team: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to toggle Team capability";
    console.error("toggleTeamCapability error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 1. MARK PROJECT READY FOR CREATIVE EXECUTION (Phase 11D Capability Hardened)
// ---------------------------------------------------------------------------

export async function markProjectReadyForCreativeExecution(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({
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

    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    if (project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.COMPLETED) {
      return { success: false, error: `Cannot mark '${project.status}' project ready for Creative Execution.` };
    }

    if (!project.resourcePlanningReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must pass Phase 9 Resource Planning Readiness gate before Creative Execution.",
      };
    }

    // Phase 11D Capability Hardening: Filter allocations using capability-backed isCreativeQualifiedAllocation
    const qualifyingAllocations = [];
    for (const a of project.ResourceAllocations) {
      if (await isCreativeQualifiedAllocation(a)) {
        qualifyingAllocations.push(a);
      }
    }

    if (qualifyingAllocations.length === 0) {
      return {
        success: false,
        error: "Business Gate Blocked: Project has no qualifying Creative/Design resource allocations with 'CREATIVE_EXECUTION' capability.",
      };
    }

    const now = new Date();
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        creativeExecutionReadyAt: now,
        creativeExecutionReadyById: session.user.id,
        creativeWorkRequirement: CreativeRequirementStatus.READY,
      },
    });

    await logItemUpdated("Project", updated.id, "Marked READY FOR CREATIVE EXECUTION");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark project ready for Creative execution";
    console.error("markProjectReadyForCreativeExecution error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 2. GET PROJECT CREATIVE OPERATIONS (Confidentiality Firewall Protected)
// ---------------------------------------------------------------------------

export async function getProjectCreativeOperations(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const briefs = await prisma.projectCreativeBrief.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        CreatedBy: { select: { id: true, name: true, email: true } },
        ApprovedBy: { select: { id: true, name: true, email: true } },
      },
    });

    const deliverables = await prisma.projectCreativeDeliverable.findMany({
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
            // CONFIDENTIALITY FIREWALL: 0 salary/payroll fields!
          },
        },
        Task: { select: { id: true, title: true, status: true, priority: true } },
        Versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            SubmittedBy: { select: { id: true, name: true, email: true } },
            ReviewedBy: { select: { id: true, name: true, email: true } },
            File: { select: { id: true, name: true, path: true, mimeType: true, size: true } },
          },
        },
        ApprovedVersion: {
          include: {
            File: { select: { id: true, name: true, path: true, mimeType: true } },
          },
        },
        CreatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      success: true,
      creativeExecutionReadyAt: project.creativeExecutionReadyAt,
      creativeExecutionReadyById: project.creativeExecutionReadyById,
      creativeWorkRequirement: project.creativeWorkRequirement,
      creativeCompletedAt: project.creativeCompletedAt,
      creativeCompletedById: project.creativeCompletedById,
      briefs,
      deliverables,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch creative operations";
    console.error("getProjectCreativeOperations error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3. CREATE OR UPDATE CREATIVE BRIEF
// ---------------------------------------------------------------------------

export async function createOrUpdateCreativeBrief(input: {
  projectId: string;
  briefId?: string;
  title: string;
  objective: string;
  targetAudience?: string;
  brandGuidelines?: string;
  styleDirection?: string;
  references?: string;
  requiredDeliverables?: string;
  dimensionsPlatforms?: string;
  notes?: string;
  dueDate?: Date | string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", input.briefId ? "edit" : "create");

    if (!project.creativeExecutionReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must be marked READY FOR CREATIVE EXECUTION before creating a Creative Brief.",
      };
    }

    const due = input.dueDate ? new Date(input.dueDate) : null;

    if (input.briefId) {
      const existing = await prisma.projectCreativeBrief.findUnique({ where: { id: input.briefId } });
      if (!existing || existing.organizationId !== project.organizationId) {
        return { success: false, error: "Creative Brief not found" };
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.projectCreativeBrief.update({
          where: { id: input.briefId },
          data: {
            title: input.title,
            objective: input.objective,
            targetAudience: input.targetAudience || null,
            brandGuidelines: input.brandGuidelines || null,
            styleDirection: input.styleDirection || null,
            references: input.references || null,
            requiredDeliverables: input.requiredDeliverables || null,
            dimensionsPlatforms: input.dimensionsPlatforms || null,
            notes: input.notes || null,
            dueDate: due,
            updatedById: session.user.id,
          },
        });

        // DOWNSTREAM INVALIDATION: Clear Creative Completion Handoff if brief is edited
        await tx.project.update({
          where: { id: input.projectId },
          data: {
            creativeCompletedAt: null,
            creativeCompletedById: null,
            creativeWorkRequirement: CreativeRequirementStatus.IN_PROGRESS,
          },
        });

        return res;
      });

      await logItemUpdated("ProjectCreativeBrief", updated.id, `Updated brief: ${updated.title}`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, brief: updated };
    } else {
      const briefNumber = `CRB-${Date.now().toString().slice(-6)}`;

      const created = await prisma.$transaction(async (tx) => {
        const res = await tx.projectCreativeBrief.create({
          data: {
            organizationId: project.organizationId,
            projectId: input.projectId,
            briefNumber,
            title: input.title,
            objective: input.objective,
            targetAudience: input.targetAudience || null,
            brandGuidelines: input.brandGuidelines || null,
            styleDirection: input.styleDirection || null,
            references: input.references || null,
            requiredDeliverables: input.requiredDeliverables || null,
            dimensionsPlatforms: input.dimensionsPlatforms || null,
            notes: input.notes || null,
            dueDate: due,
            status: CreativeBriefStatus.DRAFT,
            createdById: session.user.id,
          },
        });

        await tx.project.update({
          where: { id: input.projectId },
          data: { creativeWorkRequirement: CreativeRequirementStatus.IN_PROGRESS },
        });

        return res;
      });

      await logItemCreated("ProjectCreativeBrief", created.id, `Created brief: ${created.title} (${briefNumber})`);
      await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);
      return { success: true, brief: created };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save Creative Brief";
    console.error("createOrUpdateCreativeBrief error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 4. APPROVE CREATIVE BRIEF
// ---------------------------------------------------------------------------

export async function approveCreativeBrief(briefId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const brief = await prisma.projectCreativeBrief.findUnique({ where: { id: briefId } });
    if (!brief) return { success: false, error: "Creative Brief not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(brief.organizationId);
    await verifyServerPermission(session.user.id, "projects", "approve");

    if (brief.status === CreativeBriefStatus.APPROVED) {
      return { success: true, brief, idempotent: true };
    }

    const updated = await prisma.projectCreativeBrief.update({
      where: { id: briefId },
      data: {
        status: CreativeBriefStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: session.user.id,
      },
    });

    await logItemUpdated("ProjectCreativeBrief", updated.id, "Approved Creative Brief");
    await revalidateBothPaths(`/dashboard/projects/${brief.projectId}`);

    return { success: true, brief: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to approve Creative Brief";
    console.error("approveCreativeBrief error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 5. CREATE CREATIVE DELIVERABLE (Phase 11D Capability Guarded L1-L10)
// ---------------------------------------------------------------------------

export async function createCreativeDeliverable(input: {
  projectId: string;
  creativeBriefId?: string;
  taskId?: string;
  title: string;
  deliverableType?: CreativeDeliverableType;
  description?: string;
  assignedEmployeeId?: string;
  dueDate?: Date | string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "create");

    if (!project.creativeExecutionReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must be marked READY FOR CREATIVE EXECUTION before creating Creative Deliverables.",
      };
    }

    // CAPABILITY QUALIFICATION GUARD (L1-L10): Validate assigned designer
    if (input.assignedEmployeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: input.assignedEmployeeId },
        include: {
          DepartmentRef: { select: { name: true, code: true, capabilities: true } },
          TeamRef: { select: { name: true, code: true, capabilities: true } },
        },
      });

      if (!employee || employee.organizationId !== project.organizationId) {
        return { success: false, error: "Selected designer employee does not belong to your organization." };
      }

      if (employee.status !== "active") {
        return { success: false, error: `Cannot assign inactive employee (Status: ${employee.status}).` };
      }

      // Check Phase 10 allocation on this project
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
          error: "Phase 10 Resource Allocation Gate: Selected designer has no active or planned Resource Allocation on this Project.",
        };
      }

      // Check Capability Qualification (L1-L10)
      const allocQualifies = isCreativeQualifiedAllocation({ ...validAlloc, Employee: employee });

      if (!allocQualifies) {
        return {
          success: false,
          error: `Phase 11D Capability Gate: Employee '${employee.name}' is not assigned to a canonical Creative-capable department/team with 'CREATIVE_EXECUTION' capability.`,
        };
      }
    }

    const due = input.dueDate ? new Date(input.dueDate) : null;

    const deliverable = await prisma.$transaction(async (tx) => {
      const created = await tx.projectCreativeDeliverable.create({
        data: {
          organizationId: project.organizationId,
          projectId: input.projectId,
          creativeBriefId: input.creativeBriefId || null,
          taskId: input.taskId || null,
          title: input.title,
          deliverableType: input.deliverableType || CreativeDeliverableType.OTHER,
          description: input.description || null,
          assignedEmployeeId: input.assignedEmployeeId || null,
          dueDate: due,
          status: CreativeDeliverableStatus.DRAFT,
          internalReviewStatus: CreativeReviewStatus.PENDING,
          createdById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: input.projectId },
        data: {
          creativeCompletedAt: null,
          creativeCompletedById: null,
          creativeWorkRequirement: CreativeRequirementStatus.IN_PROGRESS,
        },
      });

      return created;
    });

    await logItemCreated("ProjectCreativeDeliverable", deliverable.id, `Created deliverable: ${deliverable.title}`);
    await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);

    return { success: true, deliverable };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create Creative Deliverable";
    console.error("createCreativeDeliverable error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 6. UPDATE CREATIVE DELIVERABLE (Phase 11D Capability Reassignment Guarded)
// ---------------------------------------------------------------------------

export async function updateCreativeDeliverable(input: {
  deliverableId: string;
  title?: string;
  deliverableType?: CreativeDeliverableType;
  description?: string;
  assignedEmployeeId?: string | null;
  taskId?: string | null;
  dueDate?: Date | string | null;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const current = await prisma.projectCreativeDeliverable.findUnique({ where: { id: input.deliverableId } });
    if (!current) return { success: false, error: "Creative Deliverable not found" };

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
        return { success: false, error: "Selected designer employee does not belong to your organization." };
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
          error: "Phase 10 Resource Allocation Gate: Selected designer has no active or planned Resource Allocation on this Project.",
        };
      }

      const allocQualifies = isCreativeQualifiedAllocation({ ...validAlloc, Employee: employee });

      if (!allocQualifies) {
        return {
          success: false,
          error: `Phase 11D Capability Gate: Employee '${employee.name}' is not assigned to a canonical Creative-capable department/team with 'CREATIVE_EXECUTION' capability.`,
        };
      }
    }

    const due = input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : current.dueDate;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectCreativeDeliverable.update({
        where: { id: input.deliverableId },
        data: {
          title: input.title !== undefined ? input.title : current.title,
          deliverableType: input.deliverableType !== undefined ? input.deliverableType : current.deliverableType,
          description: input.description !== undefined ? input.description : current.description,
          assignedEmployeeId: targetEmpId,
          taskId: input.taskId !== undefined ? input.taskId : current.taskId,
          dueDate: due,
          updatedById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: current.projectId },
        data: {
          creativeCompletedAt: null,
          creativeCompletedById: null,
        },
      });

      return res;
    });

    await logItemUpdated("ProjectCreativeDeliverable", updated.id, `Updated deliverable: ${updated.title}`);
    await revalidateBothPaths(`/dashboard/projects/${current.projectId}`);

    return { success: true, deliverable: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update Creative Deliverable";
    console.error("updateCreativeDeliverable error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 7. SUBMIT DELIVERABLE VERSION (Phase 11 Version Race Hardened - Policy A)
// ---------------------------------------------------------------------------

export async function submitDeliverableVersion(input: {
  deliverableId: string;
  fileId?: string;
  previewUrl?: string;
  attachmentUrl?: string;
  changeSummary?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const deliverable = await prisma.projectCreativeDeliverable.findUnique({ where: { id: input.deliverableId } });
    if (!deliverable) return { success: false, error: "Creative Deliverable not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(deliverable.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    // Foreign-tenant File guard
    if (input.fileId) {
      const file = await prisma.file.findUnique({ where: { id: input.fileId } });
      if (!file || file.organizationId !== deliverable.organizationId) {
        return { success: false, error: "Attached file does not belong to your organization." };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Row lock on deliverable row for strict sequential version numbering
      await tx.$executeRawUnsafe(
        `SELECT id FROM "ProjectCreativeDeliverable" WHERE id = $1 FOR UPDATE`,
        input.deliverableId
      );

      const maxVer = await tx.creativeDeliverableVersion.aggregate({
        where: { deliverableId: input.deliverableId },
        _max: { versionNumber: true },
      });

      const nextVerNum = (maxVer._max.versionNumber || 0) + 1;

      const version = await tx.creativeDeliverableVersion.create({
        data: {
          organizationId: deliverable.organizationId,
          deliverableId: input.deliverableId,
          versionNumber: nextVerNum,
          fileId: input.fileId || null,
          previewUrl: input.previewUrl || null,
          attachmentUrl: input.attachmentUrl || null,
          changeSummary: input.changeSummary || null,
          submittedById: session.user.id,
          internalReviewStatus: CreativeReviewStatus.SUBMITTED,
        },
      });

      await tx.projectCreativeDeliverable.update({
        where: { id: input.deliverableId },
        data: {
          status: CreativeDeliverableStatus.SUBMITTED_FOR_REVIEW,
          internalReviewStatus: CreativeReviewStatus.SUBMITTED,
          updatedById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: deliverable.projectId },
        data: {
          creativeCompletedAt: null,
          creativeCompletedById: null,
          creativeWorkRequirement: CreativeRequirementStatus.REVIEW,
        },
      });

      return version;
    });

    await logItemCreated("CreativeDeliverableVersion", result.id, `Submitted v${result.versionNumber} for ${deliverable.title}`);
    await revalidateBothPaths(`/dashboard/projects/${deliverable.projectId}`);

    return { success: true, version: result };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to submit deliverable version";
    console.error("submitDeliverableVersion error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 8. REVIEW DELIVERABLE VERSION (Internal & Client Review)
// ---------------------------------------------------------------------------

export async function reviewDeliverableVersion(input: {
  versionId: string;
  action: "APPROVE" | "REQUEST_CHANGES";
  reviewNotes?: string;
  clientReviewStatus?: CreativeReviewStatus;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const version = await prisma.creativeDeliverableVersion.findUnique({
      where: { id: input.versionId },
      include: { Deliverable: true },
    });

    if (!version) return { success: false, error: "Deliverable Version not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(version.organizationId);
    await verifyServerPermission(session.user.id, "projects", "approve");

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      // Lock deliverable row
      await tx.$executeRawUnsafe(
        `SELECT id FROM "ProjectCreativeDeliverable" WHERE id = $1 FOR UPDATE`,
        version.deliverableId
      );

      const freshVer = await tx.creativeDeliverableVersion.findUnique({ where: { id: input.versionId } });
      if (!freshVer) throw new Error("Version not found");

      const isApprove = input.action === "APPROVE";
      const targetReviewStatus = isApprove ? CreativeReviewStatus.APPROVED : CreativeReviewStatus.CHANGES_REQUESTED;
      const targetDeliverableStatus = isApprove ? CreativeDeliverableStatus.APPROVED : CreativeDeliverableStatus.CHANGES_REQUESTED;

      if (freshVer.internalReviewStatus === targetReviewStatus) {
        return { version: freshVer, idempotent: true, logical: false };
      }

      isLogicalTransition = true;

      const updatedVer = await tx.creativeDeliverableVersion.update({
        where: { id: input.versionId },
        data: {
          internalReviewStatus: targetReviewStatus,
          clientReviewStatus: input.clientReviewStatus || freshVer.clientReviewStatus,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes || null,
        },
      });

      await tx.projectCreativeDeliverable.update({
        where: { id: version.deliverableId },
        data: {
          status: targetDeliverableStatus,
          internalReviewStatus: targetReviewStatus,
          clientReviewStatus: input.clientReviewStatus || version.Deliverable.clientReviewStatus,
          approvedVersionId: isApprove ? input.versionId : version.Deliverable.approvedVersionId,
          completedAt: isApprove ? new Date() : null,
          updatedById: session.user.id,
        },
      });

      // DOWNSTREAM INVALIDATION if changes requested
      if (!isApprove) {
        await tx.project.update({
          where: { id: version.Deliverable.projectId },
          data: {
            creativeCompletedAt: null,
            creativeCompletedById: null,
            creativeWorkRequirement: CreativeRequirementStatus.REVISION,
          },
        });
      }

      return { version: updatedVer, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("CreativeDeliverableVersion", result.version.id, `Reviewed version v${result.version.versionNumber}: ${input.action}`);
      await revalidateBothPaths(`/dashboard/projects/${version.Deliverable.projectId}`);
    }

    return { success: true, version: result.version, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to review deliverable version";
    console.error("reviewDeliverableVersion error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 9. MARK CREATIVE HANDOFF READY (Phase 11D Completion Gate)
// ---------------------------------------------------------------------------

export async function markCreativeHandoffReady(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { CreativeDeliverables: true },
    });

    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);
    await verifyServerPermission(session.user.id, "projects", "approve");

    if (!project.creativeExecutionReadyAt) {
      return { success: false, error: "Cannot mark Creative Handoff Ready: Project has not passed Creative Execution Readiness gate." };
    }

    if (project.CreativeDeliverables.length === 0) {
      return { success: false, error: "Cannot mark Creative Handoff Ready: Project must have at least one Creative Deliverable." };
    }

    const unapproved = project.CreativeDeliverables.filter(
      (d) => d.status !== CreativeDeliverableStatus.APPROVED && d.status !== CreativeDeliverableStatus.COMPLETED
    );

    if (unapproved.length > 0) {
      return {
        success: false,
        error: `Cannot mark Creative Handoff Ready: ${unapproved.length} deliverable(s) are not yet approved/completed.`,
      };
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        creativeCompletedAt: new Date(),
        creativeCompletedById: session.user.id,
        creativeWorkRequirement: CreativeRequirementStatus.COMPLETED,
      },
    });

    await logItemUpdated("Project", updated.id, "Marked CREATIVE HANDOFF READY");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark Creative handoff ready";
    console.error("markCreativeHandoffReady error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 10. REOPEN CREATIVE DELIVERABLE (Downstream Invalidation Policy)
// ---------------------------------------------------------------------------

export async function reopenCreativeDeliverable(deliverableId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const deliverable = await prisma.projectCreativeDeliverable.findUnique({ where: { id: deliverableId } });
    if (!deliverable) return { success: false, error: "Creative Deliverable not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(deliverable.organizationId);
    await verifyServerPermission(session.user.id, "projects", "edit");

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectCreativeDeliverable.update({
        where: { id: deliverableId },
        data: {
          status: CreativeDeliverableStatus.IN_PROGRESS,
          internalReviewStatus: CreativeReviewStatus.PENDING,
          approvedVersionId: null,
          completedAt: null,
        },
      });

      // DOWNSTREAM INVALIDATION
      await tx.project.update({
        where: { id: deliverable.projectId },
        data: {
          creativeCompletedAt: null,
          creativeCompletedById: null,
          creativeWorkRequirement: CreativeRequirementStatus.IN_PROGRESS,
        },
      });

      return res;
    });

    await logItemUpdated("ProjectCreativeDeliverable", updated.id, "Reopened Creative Deliverable — Handoff readiness invalidated");
    await revalidateBothPaths(`/dashboard/projects/${deliverable.projectId}`);

    return { success: true, deliverable: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reopen Creative Deliverable";
    console.error("reopenCreativeDeliverable error:", error);
    return { success: false, error: msg };
  }
}

export async function validateCreativeCompletionEligibility(projectId: string): Promise<{ eligible: boolean; reason?: string }> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { CreativeDeliverables: true },
    });
    if (!project) {
      return { eligible: false, reason: "Project not found" };
    }
    const deliverables = project.CreativeDeliverables || [];
    if (deliverables.length === 0) {
      return { eligible: true };
    }
    const pending = deliverables.filter((d) => d.status !== "COMPLETED");
    if (pending.length > 0) {
      return { eligible: false, reason: `${pending.length} creative deliverable(s) are not approved` };
    }
    return { eligible: true };
  } catch (err: any) {
    return { eligible: false, reason: err.message || "Failed to validate creative completion" };
  }
}
