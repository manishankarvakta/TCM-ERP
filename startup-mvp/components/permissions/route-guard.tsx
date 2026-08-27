"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getPermissionKeyFromPath } from "@/lib/navigation-builder";
import { toast } from "sonner";

interface RouteGuardProps {
  children: React.ReactNode;
  permissions: any;
  role?: string;
}

export default function RouteGuard({ children, permissions, role }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    // 1. Admin bypass
    if (role?.toLowerCase() === "admin") {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    // 2. Main Dashboard & Profile bypass
    if (
      pathname === "/dashboard" || 
      pathname === "/dashboard/profile" || 
      pathname === "/dashboard/profile/edit"
    ) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    // 3. Resolve path to permission key
    const permissionKey = getPermissionKeyFromPath(pathname);
    if (!permissionKey) {
      // If path is not registered in the Navigation structure, allow it by default
      setAuthorized(true);
      setChecking(false);
      return;
    }

    // 4. Validate permissions
    const pagePermission = permissions[permissionKey];
    let hasAccess = false;

    if (pagePermission) {
      hasAccess =
        pagePermission.pageAccess === true ||
        (Array.isArray(pagePermission.operations) && pagePermission.operations.length > 0);
    }

    // Fallback: Check parent module permission
    if (!hasAccess && permissionKey.includes(".")) {
      const [parentModule] = permissionKey.split(".");
      const parentPermission = permissions[parentModule];
      if (parentPermission) {
        hasAccess =
          parentPermission.pageAccess === true ||
          (Array.isArray(parentPermission.operations) && parentPermission.operations.length > 0);
      }
    }

    if (!hasAccess) {
      setAuthorized(false);
      setChecking(false);
      toast.error("Access Denied: You do not have permission to view that page.");
      router.replace("/dashboard");
    } else {
      setAuthorized(true);
      setChecking(false);
    }
  }, [pathname, permissions, role, router]);

  // While checking or if unauthorized, show empty screen (no unauthorized flashes)
  if (checking || !authorized) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          <span className="text-xs font-semibold text-muted-foreground animate-pulse">Syncing Permissions...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
