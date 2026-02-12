"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Create a new doc
 */
export async function createDoc(input: {
  title: string;
  content?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "docs", "create"))) {
      return { success: false, error: "Permission Denied: docs.create" };
    }

    const doc = await prisma.doc.create({
      data: {
        ...input,
        userId: session.user.id,
      },
    });

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
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "docs", "edit"))) {
      return { success: false, error: "Permission Denied: docs.edit" };
    }

    const doc = await prisma.doc.update({
      where: { id },
      data: input,
    });

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

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "docs", "delete-permanently"))) {
      return { success: false, error: "Permission Denied: docs.delete-permanently" };
    }

    await prisma.doc.delete({
      where: { id },
    });

    revalidateBothPaths("docs");
    return { success: true };
  } catch (error) {
    console.error("deleteDoc error:", error);
    return { success: false, error: "Failed to delete doc" };
  }
}

/**
 * Get docs (paginated)
 */
export async function getDocs(page: number = 1, limit: number = 20) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", docs: [] };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "docs", "view"))) {
      return { success: false, error: "Permission Denied: docs.view", docs: [] };
    }

    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      prisma.doc.count(),
      prisma.doc.findMany({
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
      docs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("getDocs error:", error);
    return { success: false, error: "Failed to fetch docs", docs: [] };
  }
}

/**
 * Get a single doc by ID
 */
export async function getDocById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "docs", "view"))) {
      return { success: false, error: "Permission Denied: docs.view" };
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
