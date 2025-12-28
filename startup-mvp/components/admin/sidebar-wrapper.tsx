import { auth } from "@/lib/auth";
import {
  getNavigationPermissions,
  getUserPermissionsEnhanced,
} from "@/lib/permissions";
import { NAVIGATION_STRUCTURE, type PagePermission } from "@/types/permissions";
import DashboardSidebar from "./sidebar";

export default async function DashboardSidebarWrapper() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get user's permissions in enhanced format
  const permissions = await getUserPermissionsEnhanced(session.user.id);
  
  // Check if user has any permissions (excluding always visible items)
  const hasAnyPermissions = Object.keys(permissions).length > 0;
  
  // Get user's visible navigation items
  let visibleNavigations = await getNavigationPermissions(session.user.id);
  
  // Build accessible pages map (permissionKey -> has access)
  const accessiblePages = new Map<string, boolean>();
  
  if (!hasAnyPermissions) {
    // User has no permissions - only show Dashboard and Profile
    // Settings is excluded even though it's alwaysVisible
    visibleNavigations = new Set(["dashboard", "profile"]);
    
    // Only set Dashboard and Profile as accessible
    accessiblePages.set("dashboard", true);
    accessiblePages.set("profile", true);
    // Explicitly exclude Settings pages
    for (const navItem of NAVIGATION_STRUCTURE) {
      if (navItem.id === "settings") {
        for (const page of navItem.pages) {
          accessiblePages.set(page.permissionKey, false);
        }
      }
    }
  } else {
    // User has permissions - build full accessible pages map
    // IMPORTANT: We iterate through ALL pages in NAVIGATION_STRUCTURE to ensure
    // every page is in the accessiblePages map (either true or false)
    for (const navItem of NAVIGATION_STRUCTURE) {
      for (const page of navItem.pages) {
        const pagePerm = permissions[page.permissionKey] as PagePermission | undefined;
        
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
  }

  return (
    <DashboardSidebar
      visibleNavigations={visibleNavigations}
      accessiblePages={accessiblePages}
    />
  );
}

