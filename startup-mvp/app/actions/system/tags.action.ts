"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTags() {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, tags };
    } catch (error) {
        console.error("getTags error:", error);
        return { success: false, error: "Failed to fetch tags" };
    }
}

export async function createTag(name: string, color?: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const tag = await prisma.tag.create({
            data: { name, color }
        });
        
        return { success: true, tag };
    } catch (error) {
        console.error("createTag error:", error);
        return { success: false, error: "Failed to create tag (it might already exist)" };
    }
}

export async function attachTag(tagId: string, entityType: "task" | "issue" | "milestone", entityId: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        if (entityType === "task") {
            await prisma.task.update({ where: { id: entityId }, data: { tags: { connect: { id: tagId } } } });
        } else if (entityType === "issue") {
            await prisma.issue.update({ where: { id: entityId }, data: { tags: { connect: { id: tagId } } } });
        } else if (entityType === "milestone") {
            await prisma.milestone.update({ where: { id: entityId }, data: { tags: { connect: { id: tagId } } } });
        }

        revalidatePath(`/dashboard/projects`);
        return { success: true };
    } catch (error) {
        console.error("attachTag error:", error);
        return { success: false, error: "Failed to attach tag" };
    }
}

export async function detachTag(tagId: string, entityType: "task" | "issue" | "milestone", entityId: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        if (entityType === "task") {
            await prisma.task.update({ where: { id: entityId }, data: { tags: { disconnect: { id: tagId } } } });
        } else if (entityType === "issue") {
            await prisma.issue.update({ where: { id: entityId }, data: { tags: { disconnect: { id: tagId } } } });
        } else if (entityType === "milestone") {
            await prisma.milestone.update({ where: { id: entityId }, data: { tags: { disconnect: { id: tagId } } } });
        }

        revalidatePath(`/dashboard/projects`);
        return { success: true };
    } catch (error) {
        console.error("detachTag error:", error);
        return { success: false, error: "Failed to detach tag" };
    }
}
