"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Create a new note
 */
export async function createNote(input: {
  title: string;
  content?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "notes", "create"))) {
      return { success: false, error: "Permission Denied: notes.create" };
    }

    const note = await prisma.note.create({
      data: {
        ...input,
        userId: session.user.id,
      },
    });

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
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "notes", "edit"))) {
      return { success: false, error: "Permission Denied: notes.edit" };
    }

    const note = await prisma.note.update({
      where: { id },
      data: input,
    });

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

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "notes", "delete-permanently"))) {
      return { success: false, error: "Permission Denied: notes.delete-permanently" };
    }

    await prisma.note.delete({
      where: { id },
    });

    revalidateBothPaths("notes");
    return { success: true };
  } catch (error) {
    console.error("deleteNote error:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

/**
 * Get notes (paginated)
 */
export async function getNotes(page: number = 1, limit: number = 20) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", notes: [] };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "notes", "view"))) {
      return { success: false, error: "Permission Denied: notes.view", notes: [] };
    }

    const skip = (page - 1) * limit;

    const [total, notes] = await Promise.all([
      prisma.note.count(),
      prisma.note.findMany({
        skip,
        take: limit,
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
      })
    ]);

    return {
      success: true,
      notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("getNotes error:", error);
    return { success: false, error: "Failed to fetch notes", notes: [] };
  }
}

/**
 * Get a single note by ID
 */
export async function getNoteById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "notes", "view"))) {
      return { success: false, error: "Permission Denied: notes.view" };
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
