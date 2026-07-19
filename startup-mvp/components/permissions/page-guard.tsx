import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessPage, canAccessSubModule, canAccessModule } from "@/lib/permissions";
import type { Module, Operation } from "@/types/permissions";

interface PageGuardProps {
  children: React.ReactNode;
  permissionKey: string; // Module or sub-module (e.g., "items" or "items.groups")
  requiredOperation?: Operation; // Optional operation check (e.g., "read" or "view")
  fallback?: React.ReactNode; // Optional fallback UI instead of redirect
}

/**
 * PageGuard - Server component that protects pages based on permissions
 * Redirects to dashboard with error message if user doesn't have access
 */
export default async function PageGuard({
  children,
  permissionKey,
  requiredOperation,
  fallback,
}: PageGuardProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }



  // Check if user is admin (query database role as fallback to bypass session cache drifts)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = session.user.role?.toLowerCase() === "admin" || dbUser?.role?.toLowerCase() === "admin";

  // Dashboard is always accessible, and Settings pages are always accessible to admins
  if (permissionKey === "dashboard" || (isAdmin && (permissionKey === "settings" || permissionKey.startsWith("settings.")))) {
    return <>{children}</>;
  }

  // Try new permission structure first (pageAccess)
  let hasAccess = await canAccessPage(session.user.id, permissionKey);

  // Fallback to old structure for backward compatibility
  if (!hasAccess) {
    const isSubModule = permissionKey.includes(".");
    if (isSubModule) {
      hasAccess = await canAccessSubModule(session.user.id, permissionKey);
    } else {
      hasAccess = await canAccessModule(session.user.id, permissionKey as Module);
    }
  }

  // If specific operation is required, check it
  if (hasAccess && requiredOperation) {
    const { hasPermission } = await import("@/lib/permissions");
    hasAccess = await hasPermission(
      session.user.id,
      permissionKey,
      requiredOperation
    );
  }

  if (!hasAccess) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    // Redirect to dashboard with error message
    const errorMessage = encodeURIComponent(
      "You don't have permission to access this page."
    );
    redirect(`/dashboard?error=${errorMessage}`);
  }

  return <>{children}</>;
}

