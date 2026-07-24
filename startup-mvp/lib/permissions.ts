"use server";

import { prisma } from "@/lib/prisma";
import type {
  Module,
  Operation,
  PartialPermissions,
  Permissions,
  EnhancedPermissions,
  PagePermission,
} from "@/types/permissions";
import {
  isEnhancedPermissions,
  convertToEnhancedPermissions,
  NAVIGATION_STRUCTURE,
} from "@/types/permissions";

/**
 * Get user's merged permissions (template + user overrides)
 * Returns enhanced format if available, otherwise legacy format
 * 
 * Note: With the new approach, UserPermission records store ALL permissions (not just overrides).
 * If UserPermission records exist, they are used directly. Otherwise, template permissions are used.
 */
export async function getUserPermissions(
  userId: string
): Promise<PartialPermissions> {
  try {
    // Get user with template and user permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        designationTemplate: true,
        userPermissions: true,
      },
    });

    if (!user) {
      return {};
    }

    let mergedPermissions: PartialPermissions = {};

    const userRole = user.role?.toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "super admin" || userRole === "superadmin";

    if (user.userPermissions && user.userPermissions.length > 0) {
      // If UserPermission records exist, use them directly
      for (const userPerm of user.userPermissions) {
        const permissionKey = userPerm.module;
        const operations = userPerm.operations as Operation[];
        mergedPermissions[permissionKey] = operations;
      }
    } else if (user.designationTemplate?.permissions) {
      // If no UserPermission records, fall back to template permissions
      const templatePerms = user.designationTemplate
        .permissions as PartialPermissions;
      mergedPermissions = { ...templatePerms };
    } else if (isAdmin) {
      // Default admin role has all permissions enabled if no custom setup exists
      for (const navItem of NAVIGATION_STRUCTURE) {
        for (const page of navItem.pages) {
          mergedPermissions[page.permissionKey] = page.operations;
        }
      }
    }

    // Convert legacy format to enhanced format if needed
    if (!isEnhancedPermissions(mergedPermissions)) {
      mergedPermissions = convertToEnhancedPermissions(
        mergedPermissions as Partial<Permissions>
      );
    }

    return mergedPermissions;
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return {};
  }
}

/**
 * Get user's permissions in enhanced format
 */
export async function getUserPermissionsEnhanced(
  userId: string
): Promise<Partial<EnhancedPermissions>> {
  const permissions = await getUserPermissions(userId);
  if (isEnhancedPermissions(permissions)) {
    return permissions;
  }
  return convertToEnhancedPermissions(permissions as Partial<Permissions>);
}

/**
 * Check if user has a specific permission
 * @param permissionKey - Can be a module (e.g., "items") or sub-module (e.g., "items.groups")
 */
export async function hasPermission(
  userId: string,
  permissionKey: string,
  operation: Operation
): Promise<boolean> {
  try {
    const permissions = await getUserPermissionsEnhanced(userId);
    const pagePermission = permissions[permissionKey] as PagePermission | undefined;
    
    if (pagePermission && pagePermission.operations && Array.isArray(pagePermission.operations)) {
      return pagePermission.operations.includes(operation);
    }
    
    return false;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if user can access a module at all (has at least one permission)
 * Checks both module-level and sub-module permissions
 */
export async function canAccessModule(
  userId: string,
  module: Module
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId);
    
    // Check module-level permission
    const modulePerms = permissions[module];
    const hasModPerms = modulePerms && ((Array.isArray(modulePerms) && modulePerms.length > 0) || (!Array.isArray(modulePerms) && modulePerms.operations && modulePerms.operations.length > 0));
    if (hasModPerms) return true;
    
    // Check sub-module permissions
    const subModuleKeys = Object.keys(permissions).filter((key) =>
      key.startsWith(`${module}.`)
    );
    return subModuleKeys.some((key) => {
      const p = permissions[key];
      return p && ((Array.isArray(p) && p.length > 0) || (!Array.isArray(p) && p.operations && p.operations.length > 0));
    });
  } catch (error) {
    console.error("Error checking module access:", error);
    return false;
  }
}

/**
 * Check if user can access a specific sub-module/page
 */
export async function canAccessSubModule(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  try {
    const permissions = await getUserPermissionsEnhanced(userId);
    const pagePermission = permissions[permissionKey] as PagePermission | undefined;
    
    if (pagePermission) {
      return pagePermission.pageAccess === true;
    }
    
    // Also check parent module permission
    if (permissionKey.includes(".")) {
      const [parentModule] = permissionKey.split(".");
      const parentPermission = permissions[parentModule] as PagePermission | undefined;
      if (parentPermission?.pageAccess) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking sub-module access:", error);
    return false;
  }
}

/**
 * Check if user can see a navigation item in sidebar
 */
export async function canSeeNavigation(
  userId: string,
  navigationId: string
): Promise<boolean> {
  try {
    const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === navigationId);
    if (!navItem) return false;
    
    const permissions = await getUserPermissionsEnhanced(userId);
    const hasAnyPermissions = Object.keys(permissions).length > 0;
    
    // Always visible items (Dashboard, Profile)
    // Settings is always visible but only if user has permissions
    if (navItem.alwaysVisible) {
      // If user has no permissions, only Dashboard and Profile are visible
      if (!hasAnyPermissions) {
        return navigationId === "dashboard" || navigationId === "profile";
      }
      return true; // User has permissions, show all always visible items
    }
    
    // For non-always-visible items, check permissions
    if (!hasAnyPermissions) {
      return false; // No permissions = no access to non-always-visible items
    }
    
    // Check if any page under this navigation is visible
    for (const page of navItem.pages) {
      const pagePermission = permissions[page.permissionKey] as PagePermission | undefined;
      // Only show navigation if permission exists, has operations, and is visible
      if (
        pagePermission &&
        pagePermission.operations &&
        pagePermission.operations.length > 0 &&
        pagePermission.navigationVisible
      ) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking navigation visibility:", error);
    return false;
  }
}

/**
 * Check if user can access a specific page
 */
export async function canAccessPage(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  try {
    const permissions = await getUserPermissionsEnhanced(userId);
    const pagePermission = permissions[permissionKey] as PagePermission | undefined;
    
    if (pagePermission) {
      return pagePermission.pageAccess === true;
    }
    
    // Also check parent module permission
    if (permissionKey.includes(".")) {
      const [parentModule] = permissionKey.split(".");
      const parentPermission = permissions[parentModule] as PagePermission | undefined;
      if (parentPermission?.pageAccess) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking page access:", error);
    return false;
  }
}

/**
 * Get all navigation items user can see
 */
export async function getNavigationPermissions(
  userId: string
): Promise<Set<string>> {
  const visibleNavigations = new Set<string>();
  
  for (const navItem of NAVIGATION_STRUCTURE) {
    if (await canSeeNavigation(userId, navItem.id)) {
      visibleNavigations.add(navItem.id);
    }
  }
  
  return visibleNavigations;
}

/**
 * Get available operations for a specific page
 */
export async function getPageOperations(
  userId: string,
  permissionKey: string
): Promise<Operation[]> {
  try {
    const permissions = await getUserPermissionsEnhanced(userId);
    const pagePermission = permissions[permissionKey] as PagePermission | undefined;
    
    if (pagePermission?.operations) {
      return pagePermission.operations;
    }
    
    // Also check parent module permission
    if (permissionKey.includes(".")) {
      const [parentModule] = permissionKey.split(".");
      const parentPermission = permissions[parentModule] as PagePermission | undefined;
      if (parentPermission?.operations) {
        return parentPermission.operations;
      }
    }
    
    return [];
  } catch (error) {
    console.error("Error getting page operations:", error);
    return [];
  }
}

/**
 * Get list of modules user can access
 */
export async function getUserModules(userId: string): Promise<Module[]> {
  try {
    const permissions = await getUserPermissions(userId);
    const accessibleModules = new Set<Module>();
    
    // Check all permission keys
    for (const key of Object.keys(permissions)) {
      const p = permissions[key];
      const hasPerms = p && ((Array.isArray(p) && p.length > 0) || (!Array.isArray(p) && p.operations && p.operations.length > 0));
      if (hasPerms) {
        // Extract module from key (e.g., "items.groups" -> "items")
        const module = key.split(".")[0] as Module;
        if (module) {
          accessibleModules.add(module);
        }
      }
    }
    
    return Array.from(accessibleModules);
  } catch (error) {
    console.error("Error getting user modules:", error);
    return [];
  }
}

/**
 * Get list of accessible sub-modules for a specific module
 */
export async function getUserSubModules(
  userId: string,
  module: Module
): Promise<string[]> {
  try {
    const permissions = await getUserPermissions(userId);
    const accessibleSubModules: string[] = [];
    
    // Check module-level permission - grants access to all sub-modules
    const pMod = permissions[module];
    const hasModPerms = pMod && ((Array.isArray(pMod) && pMod.length > 0) || (!Array.isArray(pMod) && pMod.operations && pMod.operations.length > 0));
    if (hasModPerms) {
      return ["*"]; // Wildcard means all sub-modules
    }
    
    // Check individual sub-module permissions
    for (const key of Object.keys(permissions)) {
      const p = permissions[key];
      const hasPerms = p && ((Array.isArray(p) && p.length > 0) || (!Array.isArray(p) && p.operations && p.operations.length > 0));
      if (key.startsWith(`${module}.`) && hasPerms) {
        const subModule = key.split(".")[1];
        if (subModule) {
          accessibleSubModules.push(subModule);
        }
      }
    }
    
    return accessibleSubModules;
  } catch (error) {
    console.error("Error getting user sub-modules:", error);
    return [];
  }
}

/**
 * Check if user has any of the specified operations for a module
 */
export async function hasAnyPermission(
  userId: string,
  module: Module,
  operations: Operation[]
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId);
    const modulePermissions = permissions[module] || [];
    const opsArray = Array.isArray(modulePermissions) ? modulePermissions : (modulePermissions as any).operations || [];
    return operations.some((op) => opsArray.includes(op));
  } catch (error) {
    console.error("Error checking any permission:", error);
    return false;
  }
}

/**
 * Check if user has all of the specified operations for a module
 */
export async function hasAllPermissions(
  userId: string,
  module: Module,
  operations: Operation[]
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId);
    const modulePermissions = permissions[module] || [];
    const opsArray = Array.isArray(modulePermissions) ? modulePermissions : (modulePermissions as any).operations || [];
    return operations.every((op) => opsArray.includes(op));
  } catch (error) {
    console.error("Error checking all permissions:", error);
    return false;
  }
}

/**
 * Update user's permission overrides
 * @param permissionKey - Can be a module (e.g., "items") or sub-module (e.g., "items.groups")
 */
export async function updateUserPermissions(
  userId: string,
  permissionKey: string,
  operations: Operation[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Always upsert user permission, even if operations array is empty
    // Empty array explicitly blocks template permissions for this key
    await prisma.userPermission.upsert({
      where: {
        userId_module: {
          userId,
          module: permissionKey,
        },
      },
      create: {
        userId,
        module: permissionKey,
        operations: operations as any,
      },
      update: {
        operations: operations as any,
      },
    });

    // Update cached permissions in user record
    const mergedPermissions = await getUserPermissions(userId);
    await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: mergedPermissions as any,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update user's designation template
 */
export async function updateUserTemplate(
  userId: string,
  templateId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        designationTemplateId: templateId,
      },
    });

    // Update cached permissions
    const mergedPermissions = await getUserPermissions(userId);
    await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: mergedPermissions as any,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


/**
 * Bulk update user permissions (for UI form submission)
 * @param permissions - Object with permission keys (e.g., "items.groups", "peoples.users") and operations
 */
export async function bulkUpdateUserPermissions(
  userId: string,
  permissions: Partial<Record<string, Operation[]>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update each permission key
    for (const [permissionKey, operations] of Object.entries(permissions)) {
      await updateUserPermissions(userId, permissionKey, operations || []);
    }

    // Update cached permissions
    const mergedPermissions = await getUserPermissions(userId);
    await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: mergedPermissions as any,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error bulk updating user permissions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete user permission overrides that are no longer needed
 * This cleans up overrides that match template or are not in the new overrides list
 */
export async function cleanupUserPermissionOverrides(
  userId: string,
  templatePermissions: Partial<Record<string, Operation[]>>,
  newOverrides: Partial<Record<string, Operation[]>>
): Promise<void> {
  try {
    // Get all user permission overrides
    const userOverrides = await prisma.userPermission.findMany({
      where: { userId },
    });

    for (const override of userOverrides) {
      const permissionKey = override.module;
      const overrideOps = (override.operations as Operation[]) || [];
      
      // Check if this override is in the new overrides list
      const isInNewOverrides = permissionKey in newOverrides;
      
      if (isInNewOverrides) {
        // It's in the new list, so we'll update it - no need to delete
        continue;
      }

      // Not in new overrides - check if it matches template
      const templateOps = templatePermissions[permissionKey] || [];
      
      // Normalize for comparison
      const overrideOpsSorted = [...new Set(overrideOps)].sort().join(",");
      const templateOpsSorted = [...new Set(templateOps)].sort().join(",");

      // If override matches template or template doesn't have this key, delete it
      if (overrideOpsSorted === templateOpsSorted || Object.keys(templatePermissions).length === 0) {
        await prisma.userPermission.delete({
          where: { id: override.id },
        });
      }
    }
  } catch (error) {
    console.error("Error cleaning up user permission overrides:", error);
    // Don't throw - this is cleanup, not critical
  }
}

/**
 * Check if user has permission to perform action (with fallback for admin)
 * Note: Admin users are also subject to permission checks per requirements
 * @param permissionKey - Can be a module (e.g., "items") or sub-module (e.g., "items.groups")
 */
export async function checkPermission(
  userId: string,
  permissionKey: string,
  operation: Operation
): Promise<boolean> {
  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // Even admins need explicit permissions per requirements
  return hasPermission(userId, permissionKey, operation);
}

// Wrapper function for convertToEnhancedPermissions (required for "use server" files)
// Since convertToEnhancedPermissions is synchronous, we wrap it in an async function
export async function convertToEnhancedPermissionsAsync(
  legacyPermissions: Partial<Permissions>
): Promise<Partial<EnhancedPermissions>> {
  // Import the function directly (it's already imported at the top of the file)
  return convertToEnhancedPermissions(legacyPermissions);
}

