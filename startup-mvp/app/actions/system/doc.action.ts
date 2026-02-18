"use server";

import { emitSystemEvent } from "@/lib/system/hooks";
import { checkSystemPermission } from "@/lib/system/permissions";
import { SystemEntityType } from "@/lib/system/types";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { createActivityRecord } from "@/lib/system/activity-ledger";
import { ActivityType } from "@/lib/system/activity-types";

/**
 * Create a new doc
 */
export async function createDoc(input: {
  title: string;
  content?: string;
  entityType?: string;
  entityId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.docs", "create"))) {
      return { success: false, error: "Permission Denied: system.docs.create" };
    }

    const doc = await prisma.doc.create({
      data: {
        title: input.title,
        content: input.content,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: session.user.id,
      } as any,
    });

    // Emit System Event if context exists (handles Activity Ledger recording)
    if (input.entityType && input.entityId) {
      await emitSystemEvent({
        entityType: input.entityType as SystemEntityType,
        entityId: input.entityId,
        eventType: 'DOC_CREATED', // Custom event type
        actorId: session.user.id,
        description: `Created document: ${doc.title}`,
        metadata: { docId: doc.id }
      });
    }

    revalidateBothPaths("docs");
    return { success: true, doc };
  } catch (error) {
    console.error("createDoc error:", error);
    return { success: false, error: "Failed to create doc" };
  }
}

/**
 * Update an existing doc
 */
export async function updateDoc(
  id: string,
  input: {
    title?: string;
    content?: string;
    entityType?: string;
    entityId?: string;
    status?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.docs", "update"))) {
      return { success: false, error: "Permission Denied: system.docs.update" };
    }

    const oldDoc = await prisma.doc.findUnique({
      where: { id },
    });

    if (!oldDoc) return { success: false, error: "Doc not found" };

    const doc = await prisma.doc.update({
      where: { id },
      data: input,
    });

    // Record update in Activity Ledger
    const entityType = (doc as any).entityType;
    const entityId = (doc as any).entityId;
    
    // Structured change tracking
    const changes: any[] = [];
    
    if (input.title !== undefined && input.title !== oldDoc.title) {
        changes.push({ field: "title", from: oldDoc.title, to: input.title });
    }
    // Content is potentially large, we mask it but log that it changed.
    if (input.content !== undefined && input.content !== oldDoc.content) {
        changes.push({ field: "content", from: "Old content", to: "New content" }); 
    }
    if (input.status !== undefined && input.status !== oldDoc.status) {
        changes.push({ field: "status", from: oldDoc.status, to: input.status });
    }

    if (changes.length > 0) {
        const entityType = (doc as any).entityType;
        const entityId = (doc as any).entityId;
        
        if (entityType && entityId) {
             await emitSystemEvent({
                entityType: entityType as SystemEntityType,
                entityId: entityId, // Fixed: use entityId
                eventType: 'DOC_UPDATED',
                actorId: session.user.id,
                description: `Updated document: ${doc.title}`,
                metadata: { 
                    docId: doc.id,
                    changes 
                }
            });
        }
    }

    revalidateBothPaths("docs");
    return { success: true, doc };
  } catch (error) {
    console.error("updateDoc error:", error);
    return { success: false, error: "Failed to update doc" };
  }
}

/**
 * Delete a doc
 */
export async function deleteDoc(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.docs", "delete"))) {
      return { success: false, error: "Permission Denied: system.docs.delete" };
    }

    // Get doc details before deletion for activity recording
    const doc = await prisma.doc.findUnique({ where: { id } });
    
    await prisma.doc.delete({
      where: { id },
    });

    // Record deletion in Activity Ledger
    if (doc) {
      const entityType = (doc as any).entityType;
      const entityId = (doc as any).entityId;
      
      if (entityType && entityId) {
        await createActivityRecord({
          type: ActivityType.DOC_DELETED,
          actorId: session.user.id,
          subject: `Deleted document: ${doc.title}`,
          contextType: entityType,
          contextId: entityId,
          subjectType: "doc",
          subjectId: doc.id,
        });
      }
    }

    revalidateBothPaths("docs");
    return { success: true };
  } catch (error) {
    console.error("deleteDoc error:", error);
    return { success: false, error: "Failed to delete doc" };
  }
}

/**
 * Get docs (cursor-based pagination for timeline)
 */
export async function getDocs(
  entityId?: string,
  entityType?: SystemEntityType,
  limit: number = 20,
  cursor?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", docs: [], hasMore: false, nextCursor: null };

    if (!(await checkSystemPermission("system.docs", "read"))) {
      return { success: false, error: "Permission Denied: system.docs.read", docs: [], hasMore: false, nextCursor: null };
    }

    const where: any = {};
    if (entityId && entityType) {
      where.entityType = entityType;
      where.entityId = entityId;
    }

    // Fetch one extra to check if there's more
    const docs = await prisma.doc.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      orderBy: { createdAt: "desc" },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, -1) : docs;

    return {
      success: true,
      docs: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  } catch (error) {
    console.error("getDocs error:", error);
    return { success: false, error: "Failed to fetch docs", docs: [], hasMore: false, nextCursor: null };
  }
}


/**
 * Get a single doc by ID
 */
export async function getDocById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.docs", "read"))) {
      return { success: false, error: "Permission Denied: system.docs.read" };
    }

    const doc = await prisma.doc.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!doc) return { success: false, error: "Doc not found" };

    return { success: true, doc };
  } catch (error) {
    console.error("getDocById error:", error);
    return { success: false, error: "Failed to fetch doc" };
  }
}
