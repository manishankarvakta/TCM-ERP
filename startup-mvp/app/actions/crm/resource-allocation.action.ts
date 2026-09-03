"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTenantAccess } from "@/lib/tenant-context";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { AllocationStatus, ProjectStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// TEMPORAL CAPACITY ENGINE
// ---------------------------------------------------------------------------

interface AllocationInterval {
  startDate: Date;
  endDate: Date;
  percent: number;
}

/**
 * Calculate the maximum concurrent capacity for an employee in a proposed
 * date range, accounting for temporal segments correctly.
 */
function calcMaxTemporalCapacity(
  existing: AllocationInterval[],
  proposedStart: Date,
  proposedEnd: Date
): number {
  if (existing.length === 0) return 0;

  const boundarySet = new Set<number>();
  boundarySet.add(proposedStart.getTime());
  boundarySet.add(proposedEnd.getTime());

  for (const a of existing) {
    const s = a.startDate.getTime();
    const e = a.endDate.getTime();
    if (s > proposedStart.getTime() && s < proposedEnd.getTime()) boundarySet.add(s);
    if (e > proposedStart.getTime() && e < proposedEnd.getTime()) boundarySet.add(e);
  }

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  let maxCapacity = 0;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const segMid = new Date((boundaries[i] + boundaries[i + 1]) / 2);
    let segTotal = 0;
    for (const a of existing) {
      if (a.startDate <= segMid && a.endDate >= segMid) {
        segTotal += a.percent;
      }
    }
    if (segTotal > maxCapacity) maxCapacity = segTotal;
  }

  const lastPoint = new Date(boundaries[boundaries.length - 1]);
  let lastSegTotal = 0;
  for (const a of existing) {
    if (a.startDate <= lastPoint && a.endDate >= lastPoint) {
      lastSegTotal += a.percent;
    }
  }
  if (lastSegTotal > maxCapacity) maxCapacity = lastSegTotal;

  return maxCapacity;
}

// ---------------------------------------------------------------------------
// FETCH RESOURCE ALLOCATIONS (Salary Firewall Protected)
// ---------------------------------------------------------------------------

export async function getProjectResourceAllocations(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", allocations: [] };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found", allocations: [] };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const allocations = await prisma.projectResourceAllocation.findMany({
      where: { projectId },
      orderBy: { allocationStartDate: "asc" },
      include: {
        Employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            designation: true,
            status: true,
            // SALARY FIREWALL: salary/payroll fields strictly omitted!
          },
        },
        Department: { select: { id: true, name: true, code: true } },
        Team: { select: { id: true, name: true, code: true } },
        RequestedBy: { select: { id: true, name: true, email: true } },
        ApprovedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return { success: true, allocations };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch allocations";
    console.error("getProjectResourceAllocations error:", error);
    return { success: false, error: msg, allocations: [] };
  }
}

// ---------------------------------------------------------------------------
// EMPLOYEE AVAILABILITY (Temporal Segment-Based)
// ---------------------------------------------------------------------------

export async function getEmployeeAvailability(
  employeeId: string,
  startDate: Date | string,
  endDate: Date | string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", totalAllocatedPercent: 0, availablePercent: 100 };

    const start = new Date(startDate);
    const end = new Date(endDate);

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { success: false, error: "Employee not found", totalAllocatedPercent: 0, availablePercent: 100 };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(employee.organizationId);

    const overlapping = await prisma.projectResourceAllocation.findMany({
      where: {
        employeeId,
        status: { in: [AllocationStatus.PLANNED, AllocationStatus.ACTIVE] },
        allocationStartDate: { lte: end },
        allocationEndDate: { gte: start },
      },
      select: {
        allocationPercent: true,
        allocationStartDate: true,
        allocationEndDate: true,
      },
    });

    const intervals: AllocationInterval[] = overlapping.map((a) => ({
      startDate: a.allocationStartDate,
      endDate: a.allocationEndDate,
      percent: a.allocationPercent,
    }));

    const maxCapacity = calcMaxTemporalCapacity(intervals, start, end);
    const availablePercent = Math.max(0, 100 - maxCapacity);

    return {
      success: true,
      maxAllocatedPercent: maxCapacity,
      totalAllocatedPercent: maxCapacity,
      availablePercent,
      overlappingCount: overlapping.length,
      workingCapacityNote: "Capacity expressed as percentage of full-time equivalent.",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to calculate availability";
    return { success: false, error: msg, totalAllocatedPercent: 0, availablePercent: 100 };
  }
}

// ---------------------------------------------------------------------------
// CREATE RESOURCE ALLOCATION
// ---------------------------------------------------------------------------

export async function createResourceAllocation(input: {
  projectId: string;
  employeeId: string;
  departmentId?: string | null;
  teamId?: string | null;
  allocationStartDate: Date | string;
  allocationEndDate: Date | string;
  allocationPercent?: number;
  plannedHours?: number | null;
  projectRole?: string | null;
  notes?: string | null;
  allowCapacityOverride?: boolean;
  overrideReason?: string | null;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // --- POLICY DECISION: CAPACITY OVERRIDE DISABLED FOR PHASE 10 ---
    if (input.allowCapacityOverride) {
      return { success: false, error: "Capacity override is disabled in this environment. Total allocation cannot exceed 100%." };
    }

    const allocPercent = input.allocationPercent !== undefined ? input.allocationPercent : 100;
    if (allocPercent <= 0) {
      return { success: false, error: "Allocation percent must be greater than 0." };
    }
    if (allocPercent > 100) {
      return { success: false, error: "Allocation percent cannot exceed 100%." };
    }

    if (input.plannedHours !== undefined && input.plannedHours !== null) {
      if (isNaN(input.plannedHours) || input.plannedHours < 0) {
        return { success: false, error: "Planned hours cannot be negative or invalid." };
      }
    }

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    if (!project.resourcePlanningReadyAt) {
      return {
        success: false,
        error: "Business Gate Blocked: Project must be marked 'READY FOR RESOURCE PLANNING' before resource allocations can be created.",
      };
    }

    if (project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.COMPLETED) {
      return { success: false, error: `Cannot allocate resources to a '${project.status}' project.` };
    }

    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee || employee.organizationId !== project.organizationId) {
      return { success: false, error: "Selected employee does not belong to your organization." };
    }

    if (employee.status !== "active") {
      return { success: false, error: `Cannot allocate inactive employee (Status: ${employee.status}).` };
    }

    const start = new Date(input.allocationStartDate);
    const end = new Date(input.allocationEndDate);
    if (end < start) {
      return { success: false, error: "Allocation end date cannot be earlier than start date." };
    }

    const allocation = await prisma.$transaction(
      async (tx) => {
        // Stable Lock on Employee row
        await tx.$executeRawUnsafe(
          `SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE`,
          input.employeeId
        );

        const overlapping = await tx.projectResourceAllocation.findMany({
          where: {
            employeeId: input.employeeId,
            status: { in: [AllocationStatus.PLANNED, AllocationStatus.ACTIVE] },
            allocationStartDate: { lte: end },
            allocationEndDate: { gte: start },
          },
          select: {
            allocationPercent: true,
            allocationStartDate: true,
            allocationEndDate: true,
          },
        });

        const intervals: AllocationInterval[] = overlapping.map((a) => ({
          startDate: a.allocationStartDate,
          endDate: a.allocationEndDate,
          percent: a.allocationPercent,
        }));

        const maxExistingCapacity = calcMaxTemporalCapacity(intervals, start, end);
        const totalProposed = maxExistingCapacity + allocPercent;

        if (totalProposed > 100) {
          throw new Error(
            `Over-allocation blocked: Employee maximum existing commitment is ${maxExistingCapacity}% in the requested period. Proposed total would be ${totalProposed}% (Capacity Limit: 100%).`
          );
        }

        return tx.projectResourceAllocation.create({
          data: {
            organizationId: project.organizationId,
            projectId: input.projectId,
            employeeId: input.employeeId,
            departmentId: input.departmentId || null,
            teamId: input.teamId || null,
            allocationStartDate: start,
            allocationEndDate: end,
            allocationPercent: allocPercent,
            plannedHours: input.plannedHours !== undefined ? input.plannedHours : null,
            projectRole: input.projectRole || null,
            notes: input.notes || null,
            status: AllocationStatus.PLANNED,
            requestedById: session.user.id,
          },
        });
      },
      { timeout: 10000 }
    );

    await logItemCreated(
      "ProjectResourceAllocation",
      allocation.id,
      `Allocated ${employee.name} (${allocPercent}%) to ${project.projectNumber || project.title}`
    );
    await revalidateBothPaths(`/dashboard/projects/${input.projectId}`);

    return { success: true, allocation };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create resource allocation";
    console.error("createResourceAllocation error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// UPDATE RESOURCE ALLOCATION (Phase 10B/10C-F Concurrency & Readiness Invalidation)
// ---------------------------------------------------------------------------

export async function updateResourceAllocation(input: {
  allocationId: string;
  employeeId?: string;
  allocationStartDate?: Date | string;
  allocationEndDate?: Date | string;
  allocationPercent?: number;
  plannedHours?: number | null;
  projectRole?: string | null;
  notes?: string | null;
  allowCapacityOverride?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (input.allowCapacityOverride) {
      return { success: false, error: "Capacity override is disabled in this environment. Total allocation cannot exceed 100%." };
    }

    const initial = await prisma.projectResourceAllocation.findUnique({
      where: { id: input.allocationId },
    });
    if (!initial) return { success: false, error: "Allocation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(initial.organizationId);

    const targetEmpId = input.employeeId || initial.employeeId;

    const updated = await prisma.$transaction(async (tx) => {
      // Lock employee rows in deterministic sorted order
      const empIdsToLock = Array.from(new Set([initial.employeeId, targetEmpId])).sort();
      for (const empId of empIdsToLock) {
        await tx.$executeRawUnsafe(`SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE`, empId);
      }

      // Re-read FRESH allocation inside transaction after acquiring lock
      const current = await tx.projectResourceAllocation.findUnique({ where: { id: input.allocationId } });
      if (!current) throw new Error("Allocation not found");

      if (current.status === AllocationStatus.CANCELLED || current.status === AllocationStatus.RELEASED) {
        throw new Error(`Cannot update an allocation in '${current.status}' status.`);
      }

      const targetStart = input.allocationStartDate ? new Date(input.allocationStartDate) : current.allocationStartDate;
      const targetEnd = input.allocationEndDate ? new Date(input.allocationEndDate) : current.allocationEndDate;
      const targetPercent = input.allocationPercent !== undefined ? input.allocationPercent : current.allocationPercent;
      const targetPlannedHours = input.plannedHours !== undefined ? input.plannedHours : current.plannedHours;

      if (targetPercent <= 0 || targetPercent > 100) {
        throw new Error("Allocation percent must be between 1 and 100.");
      }

      if (targetPlannedHours !== null && targetPlannedHours !== undefined) {
        if (isNaN(targetPlannedHours) || targetPlannedHours < 0) {
          throw new Error("Planned hours cannot be negative or invalid.");
        }
      }

      if (targetEnd < targetStart) {
        throw new Error("Allocation end date cannot be earlier than start date.");
      }

      // Check target employee capacity (excluding current allocation ID!)
      const overlapping = await tx.projectResourceAllocation.findMany({
        where: {
          employeeId: targetEmpId,
          id: { not: current.id },
          status: { in: [AllocationStatus.PLANNED, AllocationStatus.ACTIVE] },
          allocationStartDate: { lte: targetEnd },
          allocationEndDate: { gte: targetStart },
        },
        select: {
          allocationPercent: true,
          allocationStartDate: true,
          allocationEndDate: true,
        },
      });

      const intervals: AllocationInterval[] = overlapping.map((a) => ({
        startDate: a.allocationStartDate,
        endDate: a.allocationEndDate,
        percent: a.allocationPercent,
      }));

      const maxExisting = calcMaxTemporalCapacity(intervals, targetStart, targetEnd);
      if (maxExisting + targetPercent > 100) {
        throw new Error(`Over-allocation blocked: Employee max existing capacity is ${maxExisting}%. Proposed update total is ${maxExisting + targetPercent}% (> 100%).`);
      }

      const res = await tx.projectResourceAllocation.update({
        where: { id: current.id },
        data: {
          employeeId: targetEmpId,
          allocationStartDate: targetStart,
          allocationEndDate: targetEnd,
          allocationPercent: targetPercent,
          plannedHours: targetPlannedHours,
          projectRole: input.projectRole !== undefined ? input.projectRole : current.projectRole,
          notes: input.notes !== undefined ? input.notes : current.notes,
        },
      });

      // POLICY B: Material allocation update atomically clears project execution readiness
      await tx.project.update({
        where: { id: current.projectId },
        data: {
          departmentExecutionReadyAt: null,
          departmentExecutionReadyById: null,
        },
      });

      return res;
    });

    await logItemUpdated("ProjectResourceAllocation", updated.id, `Updated allocation to ${updated.allocationPercent}%`);
    await revalidateBothPaths(`/dashboard/projects/${initial.projectId}`);

    return { success: true, allocation: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update resource allocation";
    console.error("updateResourceAllocation error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// ACTIVATE RESOURCE ALLOCATION (Phase 10C-F Single-Transition Concurrency)
// ---------------------------------------------------------------------------

export async function activateResourceAllocation(allocationId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const initialAlloc = await prisma.projectResourceAllocation.findUnique({ where: { id: allocationId } });
    if (!initialAlloc) return { success: false, error: "Allocation record not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(initialAlloc.organizationId);

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      // Lock employee row
      await tx.$executeRawUnsafe(
        `SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE`,
        initialAlloc.employeeId
      );

      // Re-read FRESH allocation inside transaction after acquiring lock
      const current = await tx.projectResourceAllocation.findUnique({ where: { id: allocationId } });
      if (!current) throw new Error("Allocation record not found");

      if (current.status === AllocationStatus.ACTIVE) {
        return { allocation: current, idempotent: true, logical: false };
      }

      if (current.status !== AllocationStatus.PLANNED) {
        throw new Error(`Cannot activate allocation in status '${current.status}'. Only PLANNED allocations can be activated.`);
      }

      isLogicalTransition = true;

      const updated = await tx.projectResourceAllocation.update({
        where: { id: allocationId },
        data: {
          status: AllocationStatus.ACTIVE,
          activatedAt: current.activatedAt || new Date(),
          approvedById: session.user.id,
        },
      });

      return { allocation: updated, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("ProjectResourceAllocation", result.allocation.id, "Status: ACTIVE");
      await revalidateBothPaths(`/dashboard/projects/${initialAlloc.projectId}`);
    }

    return { success: true, allocation: result.allocation, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to activate allocation";
    console.error("activateResourceAllocation error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// PAUSE RESOURCE ALLOCATION (Phase 10C-F Single-Transition Concurrency)
// ---------------------------------------------------------------------------

export async function pauseResourceAllocation(allocationId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const initialAlloc = await prisma.projectResourceAllocation.findUnique({ where: { id: allocationId } });
    if (!initialAlloc) return { success: false, error: "Allocation record not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(initialAlloc.organizationId);

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      // Lock employee row
      await tx.$executeRawUnsafe(
        `SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE`,
        initialAlloc.employeeId
      );

      // Re-read FRESH allocation inside transaction after acquiring lock
      const current = await tx.projectResourceAllocation.findUnique({ where: { id: allocationId } });
      if (!current) throw new Error("Allocation record not found");

      if (current.status === AllocationStatus.PAUSED) {
        return { allocation: current, idempotent: true, logical: false };
      }

      if (current.status === AllocationStatus.CANCELLED || current.status === AllocationStatus.RELEASED) {
        throw new Error(`Cannot pause allocation in '${current.status}' status.`);
      }

      isLogicalTransition = true;

      const res = await tx.projectResourceAllocation.update({
        where: { id: allocationId },
        data: { status: AllocationStatus.PAUSED },
      });

      await tx.project.update({
        where: { id: current.projectId },
        data: {
          departmentExecutionReadyAt: null,
          departmentExecutionReadyById: null,
        },
      });

      return { allocation: res, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("ProjectResourceAllocation", result.allocation.id, "Status: PAUSED — Execution readiness cleared");
      await revalidateBothPaths(`/dashboard/projects/${initialAlloc.projectId}`);
    }

    return { success: true, allocation: result.allocation, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to pause allocation";
    console.error("pauseResourceAllocation error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// RELEASE RESOURCE ALLOCATION (Phase 10C-F Single-Transition Concurrency)
// ---------------------------------------------------------------------------

export async function releaseResourceAllocation(allocationId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const initialAlloc = await prisma.projectResourceAllocation.findUnique({ where: { id: allocationId } });
    if (!initialAlloc) return { success: false, error: "Allocation record not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(initialAlloc.organizationId);

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      // STABLE LOCK on Employee row
      await tx.$executeRawUnsafe(
        `SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE`,
        initialAlloc.employeeId
      );

      // Re-read FRESH allocation inside transaction after acquiring lock
      const current = await tx.projectResourceAllocation.findUnique({ where: { id: allocationId } });
      if (!current) throw new Error("Allocation record not found");

      if (current.status === AllocationStatus.RELEASED) {
        return { allocation: current, idempotent: true, logical: false };
      }

      if (current.status === AllocationStatus.CANCELLED) {
        throw new Error("Cannot release a CANCELLED allocation.");
      }

      isLogicalTransition = true;

      // Preserve existing releasedAt if already set, else set new Date()
      const releasedAt = current.releasedAt || new Date();

      const released = await tx.projectResourceAllocation.update({
        where: { id: allocationId },
        data: {
          status: AllocationStatus.RELEASED,
          releasedAt,
        },
      });

      await tx.project.update({
        where: { id: current.projectId },
        data: {
          departmentExecutionReadyAt: null,
          departmentExecutionReadyById: null,
        },
      });

      return { allocation: released, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("ProjectResourceAllocation", result.allocation.id, "Status: RELEASED — Execution readiness invalidated");
      await revalidateBothPaths(`/dashboard/projects/${initialAlloc.projectId}`);
    }

    return { success: true, allocation: result.allocation, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to release allocation";
    console.error("releaseResourceAllocation error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// CANCEL RESOURCE ALLOCATION (Phase 10C-F Single-Transition Concurrency)
// ---------------------------------------------------------------------------

export async function cancelResourceAllocation(allocationId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const initialAlloc = await prisma.projectResourceAllocation.findUnique({ where: { id: allocationId } });
    if (!initialAlloc) return { success: false, error: "Allocation record not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(initialAlloc.organizationId);

    let isLogicalTransition = false;

    const result = await prisma.$transaction(async (tx) => {
      // STABLE LOCK on Employee row
      await tx.$executeRawUnsafe(
        `SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE`,
        initialAlloc.employeeId
      );

      // Re-read FRESH allocation inside transaction after acquiring lock
      const current = await tx.projectResourceAllocation.findUnique({ where: { id: allocationId } });
      if (!current) throw new Error("Allocation record not found");

      if (current.status === AllocationStatus.CANCELLED) {
        return { allocation: current, idempotent: true, logical: false };
      }

      isLogicalTransition = true;

      const cancelled = await tx.projectResourceAllocation.update({
        where: { id: allocationId },
        data: {
          status: AllocationStatus.CANCELLED,
        },
      });

      await tx.project.update({
        where: { id: current.projectId },
        data: {
          departmentExecutionReadyAt: null,
          departmentExecutionReadyById: null,
        },
      });

      return { allocation: cancelled, idempotent: false, logical: true };
    });

    if (result.logical && isLogicalTransition) {
      await logItemUpdated("ProjectResourceAllocation", result.allocation.id, "Status: CANCELLED — Execution readiness invalidated");
      await revalidateBothPaths(`/dashboard/projects/${initialAlloc.projectId}`);
    }

    return { success: true, allocation: result.allocation, idempotent: result.idempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to cancel allocation";
    console.error("cancelResourceAllocation error:", error);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// MARK PROJECT READY FOR DEPARTMENT EXECUTION (Phase 10 Gate)
// ---------------------------------------------------------------------------

export async function markProjectReadyForDepartmentExecution(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { ResourceAllocations: true },
    });

    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    if (!project.resourcePlanningReadyAt) {
      return { success: false, error: "Cannot mark ready for Department Execution: Project has not passed Phase 9 Resource Planning Readiness gate." };
    }

    if (project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.COMPLETED) {
      return { success: false, error: `Cannot mark '${project.status}' project ready for Department Execution.` };
    }

    const qualifyingAllocations = project.ResourceAllocations.filter(
      (a) => a.status === AllocationStatus.PLANNED || a.status === AllocationStatus.ACTIVE
    );

    if (qualifyingAllocations.length === 0) {
      return {
        success: false,
        error: "Cannot mark ready for Department Execution: Project must have at least one active or planned Resource Allocation.",
      };
    }

    const now = new Date();
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        departmentExecutionReadyAt: now,
        departmentExecutionReadyById: session.user.id,
      },
    });

    await logItemUpdated("Project", updated.id, "Marked READY FOR DEPARTMENT EXECUTION");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark project ready for department execution";
    console.error("markProjectReadyForDepartmentExecution error:", error);
    return { success: false, error: msg };
  }
}
