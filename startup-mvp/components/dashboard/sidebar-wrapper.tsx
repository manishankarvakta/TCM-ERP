// Cache-bust: v5
import { auth } from "@/lib/auth";
import { getUserPermissionsEnhanced } from "@/lib/permissions";
import { NAVIGATION_STRUCTURE, type PagePermission } from "@/types/permissions";
import {
  MENU_TEMPLATE,
  BOTTOM_MENU_TEMPLATE,
  getPermissionKeyFromPath,
  type MenuItemData,
  type SubMenuItemData,
  type SubMenuGroup,
} from "@/lib/navigation-builder";
import DashboardSidebar from "./sidebar";

/**
 * Filter menu items based on user permissions
 * @param menuTemplate - The complete menu template
 * @param accessiblePages - Map of permission keys to access status
 * @returns Filtered menu items array
 */
function filterMenuByPermissions(
  menuTemplate: MenuItemData[],
  accessiblePages: Map<string, boolean>
): MenuItemData[] {
  const filteredMenu: MenuItemData[] = [];

  for (const item of menuTemplate) {
    // Handle items with subMenus
    if (item.subMenu && item.subMenu.length > 0) {
      // Filter submenu items FIRST
      const filteredSubMenu = item.subMenu
        .map((subItem) => {
          if (subItem.children && subItem.children.length > 0) {
            const filteredChildren = subItem.children.filter((child) => {
              const childKey = getPermissionKeyFromPath(child.href);
              if (!childKey) return false;
              return accessiblePages.get(childKey) === true;
            });

            const parentKey = subItem.href ? getPermissionKeyFromPath(subItem.href) : null;
            const parentAccess = parentKey ? accessiblePages.get(parentKey) === true : false;

            if (filteredChildren.length > 0 || parentAccess) {
              return { ...subItem, children: filteredChildren };
            }
            return null;
          }

          if (!subItem.href) return null;
          const permissionKey = getPermissionKeyFromPath(subItem.href);
          if (!permissionKey) {
            return null;
          }

          const hasAccess = accessiblePages.get(permissionKey);
          return hasAccess === true ? subItem : null;
        })
        .filter((subItem): subItem is SubMenuItemData => subItem !== null);

      // Only show parent if at least one submenu is accessible
      if (filteredSubMenu.length === 0) {
        continue;
      }

      // Create filtered item with filtered submenu
      filteredMenu.push({
        ...item,
        subMenu: filteredSubMenu,
      });
    }
    // Handle items with subMenuGroups
    else if (item.subMenuGroups && item.subMenuGroups.length > 0) {
      // Filter groups and items within groups
      const filteredGroups: SubMenuGroup[] = item.subMenuGroups
        .map((group) => {
          // Filter items within each group
          const filteredItems = group.items.filter((subItem) => {
            const permissionKey = getPermissionKeyFromPath(subItem.href);
            if (!permissionKey) {
              return false;
            }
            
            const hasAccess = accessiblePages.get(permissionKey);
            return hasAccess === true;
          });
          
          return {
            ...group,
            items: filteredItems,
          };
        })
        .filter((group) => group.items.length > 0); // Remove empty groups

      // Only show parent if at least one group has accessible items
      if (filteredGroups.length === 0) {
        continue;
      }

      // Create filtered item with filtered groups
      filteredMenu.push({
        ...item,
        subMenuGroups: filteredGroups,
      });
    } 
    // Handle items without subMenus (direct links)
    else if (item.href) {
      // Always visible items (Dashboard, Profile) - show regardless
      if (item.href === "/dashboard" || item.href === "/dashboard/profile") {
        filteredMenu.push(item);
        continue;
      }
      
      const permissionKey = getPermissionKeyFromPath(item.href);
      if (!permissionKey) {
        continue;
      }
      
      const hasAccess = accessiblePages.get(permissionKey);
      if (hasAccess === true) {
        filteredMenu.push(item);
      }
    }
  }

  return filteredMenu;
}

export default async function DashboardSidebarWrapper() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get user's permissions in enhanced format
  const permissions = await getUserPermissionsEnhanced(session.user.id);
  
  const isAdmin = session.user.role?.toLowerCase() === "admin";

  // Check if user has any permissions (excluding always visible items)
  const hasAnyPermissions = Object.keys(permissions).length > 0;
  
  // Build accessible pages map (permissionKey -> has access)
  const accessiblePages = new Map<string, boolean>();
  
  if (!hasAnyPermissions) {
    if (isAdmin) {
      // Default Admin with no specific permissions configured: allow full access
      accessiblePages.set("dashboard", true);
      accessiblePages.set("profile", true);
      accessiblePages.set("settings", true);
      for (const navItem of NAVIGATION_STRUCTURE) {
        for (const page of navItem.pages) {
          accessiblePages.set(page.permissionKey, true);
        }
      }
    } else {
      // Non-admin user with no permissions - only show Dashboard and Profile
      accessiblePages.set("dashboard", true);
      accessiblePages.set("profile", true);
      for (const navItem of NAVIGATION_STRUCTURE) {
        if (navItem.id === "settings") {
          for (const page of navItem.pages) {
            accessiblePages.set(page.permissionKey, false);
          }
        }
      }
    }
  } else {
    // User has permissions configured - build full accessible pages map based on actual permissions
    for (const navItem of NAVIGATION_STRUCTURE) {
      for (const page of navItem.pages) {
        let pagePerm = permissions[page.permissionKey] as PagePermission | undefined;
        
        // Fallback: Check parent module permission if sub-module permission is not defined directly
        if (!pagePerm && page.permissionKey.includes(".")) {
          const [parentModule] = page.permissionKey.split(".");
          pagePerm = permissions[parentModule] as PagePermission | undefined;
        }

        // Core rule: Check navigationVisible and pageAccess flags first
        // These flags explicitly control visibility regardless of operations
        const permissionExists = pagePerm !== undefined && pagePerm !== null;
        
        // If permission doesn't exist at all, hide it
        if (!permissionExists) {
          accessiblePages.set(page.permissionKey, false);
          continue;
        }
        
        // Check navigationVisible flag - this is the primary control for sidebar visibility
        // If navigationVisible is explicitly false, hide from navigation
        if (pagePerm.navigationVisible === false) {
          accessiblePages.set(page.permissionKey, false);
          continue;
        }
        
        // Check if operations exist and are not empty
        // Even if navigationVisible is true, we need operations to show the page
        const hasOperations = Array.isArray(pagePerm.operations) && pagePerm.operations.length > 0;
        
        // If no operations, hide the page
        if (!hasOperations) {
          accessiblePages.set(page.permissionKey, false);
          continue;
        }
        
        // At this point, we know:
        // - pagePerm exists
        // - navigationVisible is not false (could be true or undefined)
        // - hasOperations is true
        
        // For always visible items (Dashboard, Profile)
        if (navItem.alwaysVisible) {
          if (page.permissionKey === "dashboard" || page.permissionKey === "profile") {
            accessiblePages.set(page.permissionKey, true);
          } else {
            // For Settings sub-pages, check navigationVisible flag (should be true at this point)
            // Also check pageAccess as fallback
            const hasAccess = pagePerm.navigationVisible === true || pagePerm.pageAccess === true;
            accessiblePages.set(page.permissionKey, hasAccess);
          }
        } else {
          // For non-always-visible items (like sub-pages)
          // navigationVisible must be explicitly true to show in navigation
          // pageAccess can also grant access
          const hasAccess =
            pagePerm.navigationVisible === true ||
            (pagePerm.pageAccess === true && pagePerm.navigationVisible !== false);
          accessiblePages.set(page.permissionKey, hasAccess);
        }
      }
    }

    // Admin role guarantees access to Settings, Dashboard, and Profile
    if (isAdmin) {
      accessiblePages.set("settings", true);
      accessiblePages.set("dashboard", true);
      accessiblePages.set("profile", true);
    }
  }

  // Filter menu items based on permissions
  const filteredMainMenu = filterMenuByPermissions(MENU_TEMPLATE, accessiblePages);
  


  /* 
   * Filter bottom menu items
   * "Settings" should ONLY be visible to admins
   */
  let filteredBottomMenu = filterMenuByPermissions(BOTTOM_MENU_TEMPLATE, accessiblePages);
  
  // If user is NOT admin, filter out "Settings"
  if (session.user.role?.toLowerCase() !== "admin") {
    filteredBottomMenu = filteredBottomMenu.filter(item => item.label !== "Settings");
  }

  return (
    <DashboardSidebar
      menuItems={filteredMainMenu}
      bottomMenuItems={filteredBottomMenu}
    />
  );
}

