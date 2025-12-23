"use client";

import Link, { LinkProps } from "next/link";
import { hasPermission } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Module, Operation } from "@/types/permissions";

interface ProtectedLinkProps extends LinkProps {
  module: Module;
  operation: Operation;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function ProtectedLink({
  module,
  operation,
  fallback,
  children,
  className,
  ...props
}: ProtectedLinkProps) {
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

  return (
    <Link className={className} {...props}>
      {children}
    </Link>
  );
}

