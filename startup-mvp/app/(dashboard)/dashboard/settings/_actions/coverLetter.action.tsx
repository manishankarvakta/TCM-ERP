"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";

/**
 * Get paginated list of cover letters with search
 */
export async function getCoverLetters(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        coverLetters: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause for search and status
    const where: Prisma.CoverLetterWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.status = { not: "trash" };
    }

    // Get total count
    const total = await prisma.coverLetter.count({ where });

    // Get cover letters
    const coverLetters = await prisma.coverLetter.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      coverLetters,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getCoverLetters error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cover letters",
      coverLetters: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get cover letter by ID
 */
export async function getCoverLetterById(coverLetterId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        coverLetter: null,
      };
    }

    const coverLetter = await prisma.coverLetter.findUnique({
      where: { id: coverLetterId },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!coverLetter) {
      return {
        success: false,
        error: "Cover letter not found",
        coverLetter: null,
      };
    }

    return {
      success: true,
      coverLetter,
    };
  } catch (error) {
    console.error("getCoverLetterById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cover letter",
      coverLetter: null,
    };
  }
}

/**
 * Create a new cover letter
 */
export async function createCoverLetter(input: {
  title: string;
  content: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        coverLetter: null,
      };
    }

    // Create cover letter
    const coverLetter = await prisma.coverLetter.create({
      data: {
        title: input.title,
        content: input.content,
        status: input.status || "active",
        createdBy: session.user.id,
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Log cover letter creation
    await logItemCreated(
      session.user.id,
      "CoverLetter",
      coverLetter.id,
      coverLetter.title,
      { 
        title: coverLetter.title,
        status: coverLetter.status,
      }
    );

    // Revalidate settings page
    revalidateBothPaths("settings");

    return {
      success: true,
      coverLetter,
    };
  } catch (error) {
    console.error("createCoverLetter error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create cover letter",
      coverLetter: null,
    };
  }
}

/**
 * Update a cover letter
 */
export async function updateCoverLetter(
  coverLetterId: string,
  input: {
    title?: string;
    content?: string;
    status?: "active" | "inactive";
  }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        coverLetter: null,
      };
    }

    // Check if cover letter exists
    const existingCoverLetter = await prisma.coverLetter.findUnique({
      where: { id: coverLetterId },
    });

    if (!existingCoverLetter) {
      return {
        success: false,
        error: "Cover letter not found",
        coverLetter: null,
      };
    }

    // Track changes for logging
    const changes: string[] = [];
    if (input.title && input.title !== existingCoverLetter.title) changes.push("title");
    if (input.content && input.content !== existingCoverLetter.content) changes.push("content");
    if (input.status && input.status !== existingCoverLetter.status) changes.push("status");

    // Update cover letter
    const coverLetter = await prisma.coverLetter.update({
      where: { id: coverLetterId },
      data: {
        title: input.title !== undefined ? input.title : existingCoverLetter.title,
        content: input.content !== undefined ? input.content : existingCoverLetter.content,
        status: input.status !== undefined ? input.status : existingCoverLetter.status,
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Log cover letter update
    await logItemUpdated(
      session.user.id,
      "CoverLetter",
      coverLetter.id,
      changes,
      coverLetter.title,
      { 
        title: coverLetter.title,
        status: coverLetter.status,
      }
    );

    // Revalidate settings page
    revalidateBothPaths("settings");

    return {
      success: true,
      coverLetter,
    };
  } catch (error) {
    console.error("updateCoverLetter error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update cover letter",
      coverLetter: null,
    };
  }
}

/**
 * Delete a cover letter (move to trash)
 */
export async function deleteCoverLetter(coverLetterId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check if cover letter exists
    const existingCoverLetter = await prisma.coverLetter.findUnique({
      where: { id: coverLetterId },
    });

    if (!existingCoverLetter) {
      return {
        success: false,
        error: "Cover letter not found",
      };
    }

    // Soft delete (move to trash)
    await prisma.coverLetter.update({
      where: { id: coverLetterId },
      data: { status: "trash" },
    });

    // Log cover letter deletion
    await logItemDeleted(
      session.user.id,
      "CoverLetter",
      coverLetterId,
      existingCoverLetter.title,
      { 
        title: existingCoverLetter.title,
      }
    );

    // Revalidate settings page
    revalidateBothPaths("settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteCoverLetter error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete cover letter",
    };
  }
}

/**
 * Restore a cover letter from trash
 */
export async function restoreCoverLetter(coverLetterId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check if cover letter exists and is in trash
    const existingCoverLetter = await prisma.coverLetter.findUnique({
      where: { id: coverLetterId },
    });

    if (!existingCoverLetter) {
      return {
        success: false,
        error: "Cover letter not found",
      };
    }

    if (existingCoverLetter.status !== "trash") {
      return {
        success: false,
        error: "Cover letter is not in trash",
      };
    }

    // Restore cover letter
    await prisma.coverLetter.update({
      where: { id: coverLetterId },
      data: { status: "active" },
    });

    // Revalidate settings page
    revalidateBothPaths("settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("restoreCoverLetter error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore cover letter",
    };
  }
}

/**
 * Bulk update cover letter status
 */
export async function bulkUpdateCoverLetterStatus(
  coverLetterIds: string[],
  status: "active" | "inactive" | "trash"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (coverLetterIds.length === 0) {
      return {
        success: false,
        error: "No cover letters selected",
      };
    }

    // Update all cover letters
    await prisma.coverLetter.updateMany({
      where: {
        id: { in: coverLetterIds },
      },
      data: { status },
    });

    // Revalidate settings page
    revalidateBothPaths("settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateCoverLetterStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update cover letters",
    };
  }
}

/**
 * Permanently delete cover letters
 */
export async function deleteCoverLettersPermanently(coverLetterIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (coverLetterIds.length === 0) {
      return {
        success: false,
        error: "No cover letters selected",
      };
    }

    // Verify all cover letters are in trash
    const coverLetters = await prisma.coverLetter.findMany({
      where: {
        id: { in: coverLetterIds },
      },
    });

    const notInTrash = coverLetters.filter((cl) => cl.status !== "trash");
    if (notInTrash.length > 0) {
      return {
        success: false,
        error: "Some cover letters are not in trash",
      };
    }

    // Permanently delete
    await prisma.coverLetter.deleteMany({
      where: {
        id: { in: coverLetterIds },
      },
    });

    // Revalidate settings page
    revalidateBothPaths("settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteCoverLettersPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete cover letters",
    };
  }
}

