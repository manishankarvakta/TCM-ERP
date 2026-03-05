"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { emitSystemEvent } from "@/lib/system/hooks";
import { checkSystemPermission } from "@/lib/system/permissions";
import { SystemEntityType } from "@/lib/system/types";
import { createActivityRecord } from "@/lib/system/activity-ledger";
import { ActivityType } from "@/lib/system/activity-types";

/**
 * Create a new note
 */
export async function createNote(input: {
  title: string;
  content?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  entityType?: string;
  entityId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.notes", "create"))) {
      return { success: false, error: "Permission Denied: system.notes.create" };
    }

    // Determine polymorphic context
    const entityType = input.entityType || (input.leadId ? "lead" : input.opportunityId ? "opportunity" : input.contactId ? "contact" : undefined);
    const entityId = input.entityId || input.leadId || input.opportunityId || input.contactId;

    const note = await prisma.note.create({
      data: {
        title: input.title,
        content: input.content,
        contactId: input.contactId,
        opportunityId: input.opportunityId,
        leadId: input.leadId,
        entityType: entityType,
        entityId: entityId,
        userId: session.user.id,
      } as any,
    });

    // Emit System Event if context exists (handles Activity Ledger recording)
    if (entityType && entityId) {
      await emitSystemEvent({
        entityType: entityType as SystemEntityType,
        entityId: entityId,
        eventType: 'NOTE_CREATED',
        actorId: session.user.id,
        description: `Added note: ${note.title}`,
        metadata: { noteId: note.id }
      });
    }

    revalidateBothPaths("notes");
    return { success: true, note };
  } catch (error) {
    console.error("createNote error:", error);
    return { success: false, error: "Failed to create note" };
  }
}

/**
 * Update an existing note
 */
export async function updateNote(
  id: string,
  input: {
    title?: string;
    content?: string;
    contactId?: string;
    opportunityId?: string;
    leadId?: string;
    entityType?: string;
    entityId?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.notes", "update"))) {
      return { success: false, error: "Permission Denied: system.notes.update" };
    }

    const oldNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!oldNote) return { success: false, error: "Note not found" };

    const note = await prisma.note.update({
      where: { id },
      data: input,
    });

    // Record update in Activity Ledger
    const entityType = (note as any).entityType || (note.leadId ? "lead" : note.opportunityId ? "opportunity" : "contact");
    const entityId = (note as any).entityId || note.leadId || note.opportunityId || note.contactId;
    
    // Structured change tracking
    const changes: any[] = [];
    
    if (input.title !== undefined && input.title !== oldNote.title) {
        changes.push({ field: "title", from: oldNote.title, to: input.title });
    }
    // Content is potentially large, we might not want to log the full diff in metadata.
    // Tracking *that* it changed is useful. IF it's reasonable size, we can log it.
    // For now, let's just log that it changed, or maybe a snippet?
    // User requirement: "all significant entity updates are logged with details of who made the change and what specific fields were modified"
    // Let's log full content for now, assuming notes aren't huge blobs (unlike Docs).
    if (input.content !== undefined && input.content !== oldNote.content) {
        changes.push({ field: "content", from: "Old content", to: "New content" }); // Masking content to avoid bloat
    }

    if (changes.length > 0) {
        const entityType = (note as any).entityType || (note.leadId ? "lead" : note.opportunityId ? "opportunity" : "contact");
        const entityId = (note as any).entityId || note.leadId || note.opportunityId || note.contactId;
        
        if (entityType && entityId) {
             await emitSystemEvent({
                entityType: entityType as SystemEntityType,
                entityId: entityId,
                eventType: 'NOTE_UPDATED',
                actorId: session.user.id,
                description: `Updated note: ${note.title}`,
                metadata: { 
                    noteId: note.id,
                    changes 
                }
            });
        }
    }

    revalidateBothPaths("notes");
    return { success: true, note };
  } catch (error) {
    console.error("updateNote error:", error);
    return { success: false, error: "Failed to update note" };
  }
}

/**
 * Delete a note
 */
export async function deleteNote(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.notes", "delete"))) {
      return { success: false, error: "Permission Denied: system.notes.delete" };
    }

    // Get note details before deletion for activity recording
    const note = await prisma.note.findUnique({ where: { id } });
    
    await prisma.note.delete({
      where: { id },
    });

    // Record deletion in Activity Ledger
    if (note) {
      const entityType = (note as any).entityType || (note.leadId ? "lead" : note.opportunityId ? "opportunity" : "contact");
      const entityId = (note as any).entityId || note.leadId || note.opportunityId || note.contactId;
      
      if (entityType && entityId) {
        await createActivityRecord({
          type: ActivityType.NOTE_DELETED,
          actorId: session.user.id,
          subject: `Deleted note: ${note.title}`,
          contextType: entityType,
          contextId: entityId,
          subjectType: "note",
          subjectId: note.id,
        });
      }
    }

    revalidateBothPaths("notes");
    return { success: true };
  } catch (error) {
    console.error("deleteNote error:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

/**
 * Get notes (cursor-based pagination for timeline)
 */
export async function getNotes(
  entityId?: string,
  entityType?: SystemEntityType,
  limit: number = 20,
  cursor?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", notes: [], hasMore: false, nextCursor: null };

    if (!(await checkSystemPermission("system.notes", "read"))) {
      return { success: false, error: "Permission Denied: system.notes.read", notes: [], hasMore: false, nextCursor: null };
    }

    const where: any = {};
    if (entityId && entityType) {
      where.OR = [
        { [entityType === "lead" ? "leadId" : entityType === "opportunity" ? "opportunityId" : "contactId"]: entityId },
        { entityType, entityId }
      ];
    }
    
    // Fetch one extra to check if there's more
    const notes = await prisma.note.findMany({
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

    const hasMore = notes.length > limit;
    const items = hasMore ? notes.slice(0, -1) : notes;

    return {
      success: true,
      notes: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  } catch (error) {
    console.error("getNotes error:", error);
    return { success: false, error: "Failed to fetch notes", notes: [], hasMore: false, nextCursor: null };
  }
}


/**
 * Get a single note by ID
 */
export async function getNoteById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.notes", "read"))) {
      return { success: false, error: "Permission Denied: system.notes.read" };
    }

    const note = await prisma.note.findUnique({
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

    if (!note) return { success: false, error: "Note not found" };

    return { success: true, note };
  } catch (error) {
    console.error("getNoteById error:", error);
    return { success: false, error: "Failed to fetch note" };
  }
}
