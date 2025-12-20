"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Module, Operation } from "@/types/permissions";

interface ProtectedButtonProps extends ButtonProps {
  module: Module;
  operation: Operation;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function ProtectedButton({
  module,
  operation,
  fallback,
  children,
  ...props
}: ProtectedButtonProps) {
  const { data: session } = useSession();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (!session?.user?.id) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const access = await hasPermission(session.user.id, module, operation);
      setHasAccess(access);
      setLoading(false);
    }

    checkPermission();
  }, [session?.user?.id, module, operation]);

  if (loading) {
    return null;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <Button {...props}>{children}</Button>;
}

