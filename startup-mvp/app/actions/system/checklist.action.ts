"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getChecklists(entityType: "task" | "issue" | "milestone", entityId: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const checklists = await prisma.checklist.findMany({
            where: { entityType, entityId },
            include: { Items: { orderBy: { order: 'asc' } } },
            orderBy: { createdAt: 'asc' }
        });

        return { success: true, checklists };
    } catch (error) {
        console.error("getChecklists error:", error);
        return { success: false, error: "Failed to fetch checklists" };
    }
}

export async function createChecklist(entityType: "task" | "issue" | "milestone", entityId: string, title: string = "Checklist") {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const connectData: any = { entityType, entityId, title };
        if (entityType === "task") connectData.Task = { connect: { id: entityId } };
        if (entityType === "issue") connectData.Issue = { connect: { id: entityId } };
        if (entityType === "milestone") connectData.Milestone = { connect: { id: entityId } };

        const checklist = await prisma.checklist.create({
            data: connectData,
            include: { Items: true }
        });

        revalidatePath(`/dashboard/projects`);
        return { success: true, checklist };
    } catch (error) {
        console.error("createChecklist error:", error);
        return { success: false, error: "Failed to create checklist" };
    }
}

export async function deleteChecklist(checklistId: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        await prisma.checklist.delete({ where: { id: checklistId } });
        
        revalidatePath(`/dashboard/projects`);
        return { success: true };
    } catch (error) {
        console.error("deleteChecklist error:", error);
        return { success: false, error: "Failed to delete checklist" };
    }
}

export async function createChecklistItem(checklistId: string, content: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const count = await prisma.checklistItem.count({ where: { checklistId } });

        const item = await prisma.checklistItem.create({
            data: {
                checklistId,
                content,
                order: count
            }
        });

        revalidatePath(`/dashboard/projects`);
        return { success: true, item };
    } catch (error) {
        console.error("createChecklistItem error:", error);
        return { success: false, error: "Failed to create item" };
    }
}

export async function toggleChecklistItem(itemId: string, isCompleted: boolean) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const item = await prisma.checklistItem.update({
            where: { id: itemId },
            data: { isCompleted }
        });

        revalidatePath(`/dashboard/projects`);
        return { success: true, item };
    } catch (error) {
        console.error("toggleChecklistItem error:", error);
        return { success: false, error: "Failed to toggle item" };
    }
}

export async function deleteChecklistItem(itemId: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        await prisma.checklistItem.delete({ where: { id: itemId } });
        
        revalidatePath(`/dashboard/projects`);
        return { success: true };
    } catch (error) {
        console.error("deleteChecklistItem error:", error);
        return { success: false, error: "Failed to delete item" };
    }
}
