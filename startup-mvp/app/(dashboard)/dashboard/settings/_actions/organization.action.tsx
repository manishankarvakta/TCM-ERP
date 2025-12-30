"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { notifyUserAction } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { NotificationType } from "@prisma/client";

/**
 * Get paginated list of organizations with search
 */
export async function getOrganizations(
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
        organizations: [],
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
    const where: Prisma.OrganizationWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { website: { contains: search, mode: "insensitive" } },
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
    const total = await prisma.organization.count({ where });

    // Get organizations
    const organizations = await prisma.organization.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        details: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        status: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getOrganizations error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch organizations",
      organizations: [],
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
 * Get organization by ID
 */
export async function getOrganizationById(organizationId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        organization: null,
      };
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        details: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        status: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!organization) {
      return {
        success: false,
        error: "Organization not found",
        organization: null,
      };
    }

    return {
      success: true,
      organization,
    };
  } catch (error) {
    console.error("getOrganizationById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch organization",
      organization: null,
    };
  }
}

/**
 * Create a new organization
 */
export async function createOrganization(input: {
  name: string;
  details?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        organization: null,
      };
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: input.name,
        details: input.details || null,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        logo: input.logo || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        details: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        status: true,
        createdBy: true,
        createdAt: true,
      },
    });

    // Log organization creation
    await logItemCreated(
      session.user.id,
      "Organization",
      organization.id,
      organization.name,
      { 
        name: organization.name, 
        details: organization.details,
        address: organization.address,
        phone: organization.phone,
        email: organization.email,
        website: organization.website,
      }
    );

    // Create notification
    await notifyUserAction({
      userId: session.user.id,
      action: "organization_created",
      title: "Organization Created",
      message: `Organization "${organization.name}" has been created successfully.`,
      type: NotificationType.SUCCESS,
    });

    // Revalidate settings page for both admin and dashboard
    revalidateBothPaths("settings");

    return {
      success: true,
      organization,
    };
  } catch (error) {
    console.error("createOrganization error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create organization",
      organization: null,
    };
  }
}

/**
 * Update an organization
 */
export async function updateOrganization(input: {
  id: string;
  name: string;
  details?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        organization: null,
      };
    }

    // Check if organization exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { id: input.id },
      select: { 
        id: true, 
        name: true, 
        details: true, 
        address: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        status: true 
      },
    });

    if (!existingOrganization) {
      return {
        success: false,
        error: "Organization not found",
        organization: null,
      };
    }

    // Prepare update data
    const updateData: {
      name: string;
      details?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      logo?: string | null;
      status?: string;
    } = {
      name: input.name,
      details: input.details || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      logo: input.logo || null,
    };

    if (input.status) {
      updateData.status = input.status;
    }

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        details: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log organization update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingOrganization.name) changes.push("name");
    if (input.details !== existingOrganization.details) changes.push("details");
    if (input.address !== existingOrganization.address) changes.push("address");
    if (input.phone !== existingOrganization.phone) changes.push("phone");
    if (input.email !== existingOrganization.email) changes.push("email");
    if (input.website !== existingOrganization.website) changes.push("website");
    if (input.logo !== existingOrganization.logo) changes.push("logo");
    if (input.status && input.status !== existingOrganization.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Organization",
      organization.id,
      changes,
      organization.name,
      { 
        name: organization.name, 
        details: organization.details,
        address: organization.address,
        phone: organization.phone,
        email: organization.email,
        website: organization.website,
        changes 
      }
    );

    // Create notification
    await notifyUserAction({
      userId: session.user.id,
      action: "organization_updated",
      title: "Organization Updated",
      message: `Organization "${organization.name}" has been updated. Changes: ${changes.join(", ")}.`,
      type: NotificationType.INFO,
      changes,
    });

    // Revalidate settings page for both admin and dashboard
    revalidateBothPaths("settings");

    return {
      success: true,
      organization,
    };
  } catch (error) {
    console.error("updateOrganization error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update organization",
      organization: null,
    };
  }
}

/**
 * Delete an organization (moves to trash)
 */
export async function deleteOrganization(organizationId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get organization info before moving to trash for logging
    const organizationToDelete = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, details: true, address: true, phone: true, email: true, website: true },
    });

    if (!organizationToDelete) {
      return {
        success: false,
        error: "Organization not found",
      };
    }

    // Move organization to trash (soft delete)
    await prisma.organization.update({
      where: { id: organizationId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Organization",
      organizationId,
      organizationToDelete.name,
      { 
        name: organizationToDelete.name, 
        details: organizationToDelete.details,
        address: organizationToDelete.address,
        phone: organizationToDelete.phone,
        email: organizationToDelete.email,
        website: organizationToDelete.website,
      }
    );

    // Create notification
    await notifyUserAction({
      userId: session.user.id,
      action: "organization_deleted",
      title: "Organization Moved to Trash",
      message: `Organization "${organizationToDelete.name}" has been moved to trash.`,
      type: NotificationType.WARNING,
    });

    // Revalidate settings page for both admin and dashboard
    revalidateBothPaths("settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteOrganization error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete organization",
    };
  }
}

/**
 * Bulk update organization status
 */
export async function bulkUpdateOrganizationStatus(
  organizationIds: string[],
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

    if (organizationIds.length === 0) {
      return {
        success: false,
        error: "No organizations selected",
      };
    }

    // Get organization names for logging
    const organizations = await prisma.organization.findMany({
      where: {
        id: { in: organizationIds },
      },
      select: { id: true, name: true },
    });

    // Update organizations
    await prisma.organization.updateMany({
      where: {
        id: { in: organizationIds },
      },
      data: {
        status,
      },
    });

    // Log bulk update for each organization
    for (const org of organizations) {
      await logItemUpdated(
        session.user.id,
        "Organization",
        org.id,
        ["status"],
        org.name,
        { name: org.name, status, changes: ["status"] }
      );
    }

    // Create notification
    const actionText = status === "active" ? "restored" : status === "trash" ? "moved to trash" : "deactivated";
    await notifyUserAction({
      userId: session.user.id,
      action: "organization_bulk_updated",
      title: "Organizations Updated",
      message: `${organizations.length} organization(s) have been ${actionText}.`,
      type: status === "active" ? NotificationType.SUCCESS : status === "trash" ? NotificationType.WARNING : NotificationType.INFO,
    });

    // Revalidate settings page for both admin and dashboard
    revalidateBothPaths("settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateOrganizationStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update organizations",
    };
  }
}

/**
 * Delete organizations permanently
 */
export async function deleteOrganizationsPermanently(organizationIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (organizationIds.length === 0) {
      return {
        success: false,
        error: "No organizations selected",
      };
    }

    // Get organization names for logging
    const organizations = await prisma.organization.findMany({
      where: {
        id: { in: organizationIds },
        status: "trash", // Only allow deleting organizations that are in trash
      },
      select: { id: true, name: true },
    });

    if (organizations.length === 0) {
      return {
        success: false,
        error: "No organizations found in trash",
      };
    }

    // Log permanent deletion for each organization
    for (const org of organizations) {
      await logItemDeleted(
        session.user.id,
        "Organization",
        org.id,
        org.name,
        { name: org.name }
      );
    }

    // Delete organizations permanently
    await prisma.organization.deleteMany({
      where: {
        id: { in: organizationIds },
        status: "trash", // Only allow deleting organizations that are in trash
      },
    });

    // Create notification
    await notifyUserAction({
      userId: session.user.id,
      action: "organization_permanently_deleted",
      title: "Organizations Permanently Deleted",
      message: `${organizations.length} organization(s) have been permanently deleted.`,
      type: NotificationType.ERROR,
    });

    // Revalidate settings page for both admin and dashboard
    revalidateBothPaths("settings");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteOrganizationsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete organizations",
    };
  }
}

