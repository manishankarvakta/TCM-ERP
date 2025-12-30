import { auth } from "@/lib/auth";
import { getUserPermissionsEnhanced } from "@/lib/permissions";
import { NAVIGATION_STRUCTURE, type PagePermission } from "@/types/permissions";
import SettingsPageClient from "./settings-page-client";

export default async function SettingsWrapper() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get user's permissions in enhanced format
  const permissions = await getUserPermissionsEnhanced(session.user.id);
  
  // Check if user has any permissions
  const hasAnyPermissions = Object.keys(permissions).length > 0;
  
  // Build accessible pages map (permissionKey -> has access)
  const accessiblePages = new Map<string, boolean>();
  
  if (!hasAnyPermissions) {
    // User has no permissions - hide all settings
    for (const navItem of NAVIGATION_STRUCTURE) {
      if (navItem.id === "settings") {
        for (const page of navItem.pages) {
          accessiblePages.set(page.permissionKey, false);
        }
      }
    }
  } else {
    // User has permissions - build accessible pages map for settings
    for (const navItem of NAVIGATION_STRUCTURE) {
      if (navItem.id === "settings") {
        for (const page of navItem.pages) {
          const pagePerm = permissions[page.permissionKey] as PagePermission | undefined;
          
          const permissionExists = pagePerm !== undefined && pagePerm !== null;
          
          if (!permissionExists) {
            accessiblePages.set(page.permissionKey, false);
            continue;
          }
          
          if (pagePerm.navigationVisible === false) {
            accessiblePages.set(page.permissionKey, false);
            continue;
          }
          
          const hasOperations = Array.isArray(pagePerm.operations) && pagePerm.operations.length > 0;
          
          if (!hasOperations) {
            accessiblePages.set(page.permissionKey, false);
            continue;
          }
          
          const hasAccess =
            pagePerm.navigationVisible === true ||
            (pagePerm.pageAccess === true && pagePerm.navigationVisible !== false);
          
          accessiblePages.set(page.permissionKey, hasAccess);
        }
      }
    }
  }

  // Convert Map to plain object for serialization
  const accessiblePagesObject = Object.fromEntries(accessiblePages);

  return <SettingsPageClient accessiblePages={accessiblePagesObject} />;
}

