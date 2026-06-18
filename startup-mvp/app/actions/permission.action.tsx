"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserPermissions,
  updateUserPermissions,
  updateUserTemplate,
  bulkUpdateUserPermissions,
  cleanupUserPermissionOverrides,
  convertToEnhancedPermissionsAsync,
} from "@/lib/permissions";
import { createUserLog } from "@/lib/user-log";
import { revalidatePath as nextRevalidatePath, revalidateTag } from "next/cache";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import type {
  Module,
  Operation,
  PartialPermissions,
  Permissions,
  EnhancedPermissions,
} from "@/types/permissions";
import {
  isEnhancedPermissions,
  convertToLegacyPermissions,
  calculatePermissionOverrides,
} from "@/types/permissions";

/**
 * Get all permission templates
 */
export async function getPermissionTemplates() {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        templates: [],
      };
    }

    const templates = await prisma.permissionTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        permissions: t.permissions as PartialPermissions,
        isActive: t.isActive,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };
  } catch (error) {
    console.error("Error getting permission templates:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      templates: [],
    };
  }
}

/**
 * Get permission template by ID
 */
export async function getPermissionTemplateById(templateId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        template: null,
      };
    }

    const template = await prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return {
        success: false,
        error: "Template not found",
        template: null,
      };
    }

    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        permissions: template.permissions as PartialPermissions,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error getting permission template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      template: null,
    };
  }
}

/**
 * Create permission template
 */
export async function createPermissionTemplate(input: {
  name: string;
  description?: string;
  permissions: PartialPermissions;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        template: null,
      };
    }

    // Check if template name already exists
    const existing = await prisma.permissionTemplate.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      return {
        success: false,
        error: "Template with this name already exists",
        template: null,
      };
    }

    const template = await prisma.permissionTemplate.create({
      data: {
        name: input.name,
        description: input.description,
        permissions: input.permissions as any,
        isActive: true,
      },
    });

    await createUserLog({
      userId: session.user.id,
      action: "CREATE_PERMISSION_TEMPLATE",
      details: `Created permission template: ${input.name}`,
    });

    nextRevalidatePath("/dashboard/settings/permissions/templates");
    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        permissions: template.permissions as PartialPermissions,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error creating permission template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      template: null,
    };
  }
}

/**
 * Update permission template
 */
export async function updatePermissionTemplate(
  templateId: string,
  input: {
    name?: string;
    description?: string;
    permissions?: PartialPermissions;
    isActive?: boolean;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        template: null,
      };
    }

    // Check if template exists
    const existing = await prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      return {
        success: false,
        error: "Template not found",
        template: null,
      };
    }

    // Check name uniqueness if name is being updated
    if (input.name && input.name !== existing.name) {
      const nameExists = await prisma.permissionTemplate.findUnique({
        where: { name: input.name },
      });

      if (nameExists) {
        return {
          success: false,
          error: "Template with this name already exists",
          template: null,
        };
      }
    }

    const template = await prisma.permissionTemplate.update({
      where: { id: templateId },
      data: {
        name: input.name,
        description: input.description,
        permissions: input.permissions as any,
        isActive: input.isActive,
      },
    });

    // Update cached permissions for all users using this template
    const usersWithTemplate = await prisma.user.findMany({
      where: { designationTemplateId: templateId },
      select: { id: true },
    });

    for (const user of usersWithTemplate) {
      const mergedPermissions = await getUserPermissions(user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          permissions: mergedPermissions as any,
        },
      });
      (revalidateTag as any)(`permissions-${user.id}`);
    }

    await createUserLog({
      userId: session.user.id,
      action: "UPDATE_PERMISSION_TEMPLATE",
      details: `Updated permission template: ${template.name}`,
    });

    nextRevalidatePath("/dashboard/settings/permissions/templates");
    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        permissions: template.permissions as PartialPermissions,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error updating permission template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      template: null,
    };
  }
}

/**
 * Delete permission template
 */
export async function deletePermissionTemplate(templateId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check if template is in use
    const usersWithTemplate = await prisma.user.count({
      where: { designationTemplateId: templateId },
    });

    if (usersWithTemplate > 0) {
      return {
        success: false,
        error: `Cannot delete template. It is assigned to ${usersWithTemplate} user(s).`,
      };
    }

    const template = await prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return {
        success: false,
        error: "Template not found",
      };
    }

    await prisma.permissionTemplate.delete({
      where: { id: templateId },
    });

    await createUserLog({
      userId: session.user.id,
      action: "DELETE_PERMISSION_TEMPLATE",
      details: `Deleted permission template: ${template.name}`,
    });

    nextRevalidatePath("/dashboard/settings/permissions/templates");
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting permission template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user permissions (merged template + overrides)
 */
export async function getUserPermissionsAction(userId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        permissions: {},
        template: null,
        overrides: [],
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        designationTemplate: true,
        userPermissions: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
        permissions: {},
        template: null,
        overrides: [],
      };
    }

    // For form display: UserPermission records now store ALL permissions (not just overrides)
    // If UserPermission records exist, use them directly. Otherwise, use template permissions.
    let displayPermissions: PartialPermissions = {};
    
    if (user.userPermissions && user.userPermissions.length > 0) {
      // Use UserPermission records directly (they contain the full current state)
      for (const userPerm of user.userPermissions) {
        const permissionKey = userPerm.module;
        const operations = userPerm.operations as Operation[];
        displayPermissions[permissionKey] = operations;
      }
    } else if (user.designationTemplate?.permissions) {
      // If no UserPermission records, fall back to template permissions
      const templatePerms = user.designationTemplate.permissions as PartialPermissions;
      if (isEnhancedPermissions(templatePerms)) {
        displayPermissions = convertToLegacyPermissions(templatePerms as Partial<EnhancedPermissions>);
      } else {
        displayPermissions = { ...(templatePerms as Partial<Record<string, Operation[]>>) };
      }
    }
    
    // Convert to enhanced format for form display
    displayPermissions = await convertToEnhancedPermissionsAsync(
      displayPermissions as Partial<Permissions>
    );

    return {
      success: true,
      permissions: displayPermissions,
      template: user.designationTemplate
        ? {
            id: user.designationTemplate.id,
            name: user.designationTemplate.name,
            description: user.designationTemplate.description,
            permissions: user.designationTemplate.permissions as PartialPermissions,
          }
        : null,
      overrides: user.userPermissions.map((up) => ({
        id: up.id,
        module: up.module as Module,
        operations: up.operations as Operation[],
      })),
    };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      permissions: {},
      template: null,
      overrides: [],
    };
  }
}

/**
 * Update user permissions
 * @param permissions - Enhanced permissions structure or legacy format
 * When template is selected, saves ALL permissions to UserPermission table (not just overrides)
 */
export async function updateUserPermissionsAction(
  userId: string,
  templateId: string | null,
  permissions: Partial<Record<string, Operation[]>> | Partial<EnhancedPermissions>
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Update template assignment
    if (templateId !== null) {
      const result = await updateUserTemplate(userId, templateId);
      if (!result.success) {
        return result;
      }
    } else {
      // Remove template
      await updateUserTemplate(userId, null);
    }

    // Convert enhanced permissions to legacy format for storage
    // (UserPermission table stores operations array, not PagePermission)
    const legacyPermissions = isEnhancedPermissions(permissions)
      ? convertToLegacyPermissions(permissions)
      : permissions;

    // Save ALL permissions to UserPermission table (not just overrides)
    // This ensures all permissions are stored directly in UserPermission records
    const result = await bulkUpdateUserPermissions(userId, legacyPermissions as Partial<Record<string, Operation[]>>);

    // Clean up permissions that are no longer in the new permissions list
    if (result.success) {
      // Get all current user permissions
      const currentUserPermissions = await prisma.userPermission.findMany({
        where: { userId },
      });

      // Delete permissions that are not in the new permissions list
      const newPermissionKeys = new Set(Object.keys(legacyPermissions));
      for (const userPerm of currentUserPermissions) {
        if (!newPermissionKeys.has(userPerm.module)) {
          await prisma.userPermission.delete({
            where: { id: userPerm.id },
          });
        }
      }
    }

    if (result.success) {
      await createUserLog({
        userId: session.user.id,
        action: "UPDATE_USER_PERMISSIONS",
        details: `Updated permissions for user: ${userId}`,
      });
      
      // Revalidate affected user's permission cache using tag
      // This invalidates the cached permissions for this specific user
      (revalidateTag as any)(`permissions-${userId}`);
      
      // Revalidate affected user's dashboard to update sidebar immediately
      // Revalidating the layout will cause DashboardSidebarWrapper to re-fetch permissions
      // on the user's next navigation or page refresh
      revalidateBothPaths('', 'layout');
      revalidateBothPaths('', 'page');

      // Revalidate admin permissions page
      nextRevalidatePath(`/dashboard/settings/permissions/users/${userId}`);
    }

    return result;
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Reset user permissions to template permissions
 * Loads template permissions and saves all of them to UserPermission table
 */
export async function resetUserPermissionsToTemplate(
  userId: string,
  templateId: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get template permissions
    const template = await prisma.permissionTemplate.findUnique({
      where: { id: templateId },
      select: { permissions: true },
    });

    if (!template) {
      return {
        success: false,
        error: "Template not found",
      };
    }

    const templatePerms = template.permissions as PartialPermissions;
    
    // Convert to legacy format if needed
    let legacyPermissions: Partial<Record<string, Operation[]>> = {};
    if (isEnhancedPermissions(templatePerms)) {
      legacyPermissions = convertToLegacyPermissions(templatePerms as Partial<EnhancedPermissions>);
    } else {
      legacyPermissions = templatePerms as Partial<Record<string, Operation[]>>;
    }

    // Save all template permissions to UserPermission table
    const result = await bulkUpdateUserPermissions(userId, legacyPermissions);

    // Clean up permissions that are not in the template
    if (result.success) {
      // Get all current user permissions
      const currentUserPermissions = await prisma.userPermission.findMany({
        where: { userId },
      });

      // Delete permissions that are not in the template
      const templatePermissionKeys = new Set(Object.keys(legacyPermissions));
      for (const userPerm of currentUserPermissions) {
        if (!templatePermissionKeys.has(userPerm.module)) {
          await prisma.userPermission.delete({
            where: { id: userPerm.id },
          });
        }
      }
    }

    if (result.success) {
      await createUserLog({
        userId: session.user.id,
        action: "RESET_USER_PERMISSIONS",
        details: `Reset permissions to template for user: ${userId}`,
      });
      
      // Revalidate affected user's permission cache
      (revalidateTag as any)(`permissions-${userId}`);
      revalidateBothPaths('', 'layout');
      revalidateBothPaths('', 'page');
      nextRevalidatePath(`/dashboard/settings/permissions/users/${userId}`);
    }

    return {
      success: result.success,
      error: result.error,
      permissions: legacyPermissions,
    };
  } catch (error) {
    console.error("Error resetting user permissions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      permissions: {},
    };
  }
}

/**
 * Check for permission updates for the current user
 * Returns the timestamp of the last permission update
 * Used by client-side polling to detect permission changes
 */
export async function checkPermissionUpdates() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { 
        lastUpdated: null, 
        error: "Unauthorized" 
      };
    }

    const userId = session.user.id;

    // Get the most recent update timestamp from UserPermission table
    const latestPermission = await prisma.userPermission.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    // Also check user's updatedAt (in case template was updated)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { updatedAt: true },
    });

    // Get the most recent timestamp
    const timestamps = [
      latestPermission?.updatedAt,
      user?.updatedAt,
    ].filter(Boolean) as Date[];

    const lastUpdated = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(d => d.getTime())))
      : new Date(0); // If no permissions exist, return epoch

    return {
      lastUpdated: lastUpdated.toISOString(),
    };
  } catch (error) {
    console.error("Error checking permission updates:", error);
    return {
      lastUpdated: null,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

