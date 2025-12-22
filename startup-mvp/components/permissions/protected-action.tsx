"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { useEffect, useState } from "react";
import type { Operation } from "@/types/permissions";
import { FiEye, FiEdit, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import { getCurrentUser } from "@/app/actions/user.action";

interface ProtectedActionProps {
  permissionKey: string; // Can be module (e.g., "items") or sub-module (e.g., "items.groups")
  action: "view" | "edit" | "move-to-trash" | "delete-permanently" | "create";
  href?: string; // For view/edit/create actions that navigate
  onClick?: () => void; // For delete/trash actions
  children?: React.ReactNode; // Custom content
  buttonProps?: ButtonProps; // Additional button props
  className?: string;
  fallback?: React.ReactNode;
  userId?: string; // Optional: pass userId directly to avoid session lookup
}

// Map actions to operations
const ACTION_OPERATION_MAP: Record<
  ProtectedActionProps["action"],
  Operation[]
> = {
  view: ["view"],
  edit: ["edit"],
  "move-to-trash": ["move-to-trash"],
  "delete-permanently": ["delete-permanently"],
  create: ["create"],
};

// Default icons for actions
const ACTION_ICONS: Record<ProtectedActionProps["action"], React.ComponentType<{ className?: string }>> = {
  view: FiEye,
  edit: FiEdit,
  "move-to-trash": FiTrash2,
  "delete-permanently": FiX,
  create: FiPlus,
};

// Default labels for actions
const ACTION_LABELS: Record<ProtectedActionProps["action"], string> = {
  view: "View",
  edit: "Edit",
  "move-to-trash": "Move to Trash",
  "delete-permanently": "Delete Permanently",
  create: "Create",
};

export default function ProtectedAction({
  permissionKey,
  action,
  href,
  onClick,
  children,
  buttonProps = {},
  className,
  fallback,
  userId: providedUserId,
}: ProtectedActionProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(providedUserId || null);

  useEffect(() => {
    async function checkPermission() {
      let currentUserId = providedUserId;

      // If userId not provided, fetch it from server
      if (!currentUserId) {
        try {
          const user = await getCurrentUser();
          currentUserId = user?.id || null;
          setUserId(currentUserId);
        } catch (error) {
          console.error("Error fetching user:", error);
          setHasAccess(false);
          setLoading(false);
          return;
        }
      }

      if (!currentUserId) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check if user has any of the required operations for this action
      const requiredOperations = ACTION_OPERATION_MAP[action];
      let access = false;

      for (const operation of requiredOperations) {
        const hasOp = await hasPermission(
          currentUserId,
          permissionKey,
          operation
        );
        if (hasOp) {
          access = true;
          break;
        }
      }

      setHasAccess(access);
      setLoading(false);
    }

    checkPermission();
  }, [providedUserId, permissionKey, action]);

  if (loading) {
    return null;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  const Icon = ACTION_ICONS[action];
  const label = ACTION_LABELS[action];
  const defaultVariant: ButtonProps["variant"] =
    action === "move-to-trash" || action === "delete-permanently"
      ? "ghost"
      : "ghost";
  const defaultSize: ButtonProps["size"] = "sm";

  const buttonContent = children || (
    <>
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </>
  );

  if (href) {
    return (
      <Button
        variant={defaultVariant}
        size={defaultSize}
        asChild
        className={className}
        {...buttonProps}
      >
        <Link href={href}>{buttonContent}</Link>
      </Button>
    );
  }

  return (
    <Button
      variant={defaultVariant}
      size={defaultSize}
      onClick={onClick}
      className={className}
      {...buttonProps}
    >
      {buttonContent}
    </Button>
  );
}

