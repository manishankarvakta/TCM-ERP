"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { checkPermissionUpdates } from "@/app/actions/permission.action";

/**
 * PermissionSync component
 * Polls server action to check for permission changes and refreshes the page when detected
 * Only runs for non-admin users (admins don't need permission checks)
 */
export default function PermissionSync() {
  const router = useRouter();
  const lastCheckedRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Poll every 30 seconds for permission changes
    const POLL_INTERVAL = 30000; // 30 seconds

    const checkPermissions = async () => {
      try {
        const result = await checkPermissionUpdates();
        
        if (result.error) {
          // If unauthorized or error, stop polling
          if (result.error === "Unauthorized") {
            return;
          }
          return;
        }

        const currentLastUpdated = result.lastUpdated;

        // First check - just store the timestamp
        if (lastCheckedRef.current === null) {
          lastCheckedRef.current = currentLastUpdated;
          return;
        }

        // If timestamp changed, permissions were updated
        if (currentLastUpdated !== lastCheckedRef.current) {
          lastCheckedRef.current = currentLastUpdated;
          // Refresh the page to get updated permissions
          router.refresh();
        }
      } catch (error) {
        // Silently handle errors (network issues, etc.)
        console.error("Error checking permissions:", error);
      }
    };

    // Initial check
    checkPermissions();

    // Set up polling interval
    intervalRef.current = setInterval(checkPermissions, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [router]);

  // This component doesn't render anything
  return null;
}

