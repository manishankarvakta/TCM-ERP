"use server";

import prisma from "@/lib/prisma";
// @ts-expect-error - Legacy compatibility
import { auth } from "@/auth";
// @ts-expect-error - Legacy compatibility
import { hasPermission } from "@/lib/permission-utils";
import { broadcastProjectEvent } from "@/lib/system/realtime";

/**
 * Validates that adding [blockingId] -> [dependentId] won't cause a cycle.
 * Traverses upward to see if dependentId is already a blocking ancestor of blockingId.
 */
async function detectCycle(blockingId: string, dependentId: string, visited = new Set<string>()): Promise<boolean> {
    if (blockingId === dependentId) return true; // Direct self-cycle
    if (visited.has(blockingId)) return false;
    visited.add(blockingId);

    // Find everything that the CURRENT blockingId is dependent on.
    const ancestors = await prisma.taskDependency.findMany({
        where: { dependentTaskId: blockingId }
    });

    for (const ancestor of ancestors) {
        if (ancestor.blockingTaskId === dependentId) return true; // Cycle detected
        const hasCycle = await detectCycle(ancestor.blockingTaskId, dependentId, visited);
        if (hasCycle) return true;
    }

    return false;
}

export async function createTaskDependency(projectId: string, blockingTaskId: string, dependentTaskId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "projects.tasks", "update");
    if (!canEdit) return { success: false, error: "Insufficient permissions" };

    try {
        // 1. Run Graph Validation
        const isCycle = await detectCycle(blockingTaskId, dependentTaskId);
        if (isCycle) {
            return { success: false, error: "Circular dependency detected. This link would create an impossible deadlock." };
        }

        // 2. Persist Dependency
        const dependency = await prisma.taskDependency.create({
            data: { blockingTaskId, dependentTaskId }
        });

        // 3. Fire Realtime Synchronizer
// @ts-expect-error - Legacy compatibility
        await broadcastProjectEvent(projectId, "DEPENDENCY_CREATED", dependency);

        return { success: true, dependency };
    } catch (error: any) {
        // Handle Prisma Unique Constraint violation gracefully
        if (error.code === "P2002") {
            return { success: false, error: "This dependency already exists." };
        }
        return { success: false, error: error.message };
    }
}

export async function removeTaskDependency(projectId: string, dependencyId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "projects.tasks", "update");
    if (!canEdit) return { success: false, error: "Insufficient permissions" };

    try {
        await prisma.taskDependency.delete({
            where: { id: dependencyId }
        });

// @ts-expect-error - Legacy compatibility
        await broadcastProjectEvent(projectId, "DEPENDENCY_REMOVED", { id: dependencyId });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
