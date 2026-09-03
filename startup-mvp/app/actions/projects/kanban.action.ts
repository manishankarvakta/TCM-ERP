"use server";

import prisma from "@/lib/prisma";
// @ts-expect-error - Legacy compatibility
import { auth } from "@/auth";
// @ts-expect-error - Legacy compatibility
import { hasPermission } from "@/lib/permission-utils";
import { broadcastProjectEvent } from "@/lib/system/realtime";

export async function updateKanbanTaskStatus(taskId: string, newStatus: string, projectId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    // 1. Enforce RBAC
    const canEdit = await hasPermission(session.user.id, "projects.tasks", "update");
    if (!canEdit) {
        return { success: false, error: "Insufficient permissions to move task." };
    }

    try {
        // 2. Perform optimistic-safe atomic update
        const updatedTask = await prisma.task.update({
            where: { id: taskId, projectId },
            data: { status: newStatus }
        });

        // 3. Fire Realtime Synchronizer
        // Prevents other connected Project Managers from having stale boards
        await broadcastProjectEvent(projectId, "TASK_UPDATED", {
            id: updatedTask.id,
            status: updatedTask.status,
            updatedAt: updatedTask.updatedAt
        });

        return { success: true, task: updatedTask };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
