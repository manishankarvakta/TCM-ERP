import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface TenantContext {
  userId: string;
  userEmail: string;
  userRole: string;
  organizationId: string;
}

/**
 * Server-side Organization Context Resolver
 * Resolves the authenticated user's organizationId directly from the database.
 * FAIL-CLOSED SECURITY: Throws an explicit error if the user has no valid organizationId.
 * NEVER defaults to "default-org" at runtime.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED: Authentication session required");
  }

  const userId = session.user.id;
  const userEmail = session.user.email || "";
  const userRole = session.user.role || "user";

  // Query user's assigned organization from database
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  if (!dbUser?.organizationId) {
    throw new Error(
      "TENANT_CONTEXT_MISSING: User account is not assigned to an active organization"
    );
  }

  return {
    userId,
    userEmail,
    userRole,
    organizationId: dbUser.organizationId,
  };
}

/**
 * Helper to verify entity organization ownership.
 * Throws an explicit Unauthorized error if entity organizationId does not match tenant context.
 */
export function verifyTenantAccess(
  tenantOrgId: string,
  entityOrgId: string | null | undefined
): boolean {
  if (!entityOrgId || tenantOrgId !== entityOrgId) {
    throw new Error("UNAUTHORIZED_TENANT_ACCESS: Resource belongs to another organization");
  }
  return true;
}

/**
 * Helper to verify parent/child relationship belongs to caller's tenant organization.
 */
export function verifyParentTenantAccess(
  tenantOrgId: string,
  parentOrgId: string | null | undefined
): boolean {
  if (!parentOrgId || tenantOrgId !== parentOrgId) {
    throw new Error(
      "INVALID_PARENT_TENANT: Cannot create or link child resource under a parent from another organization"
    );
  }
  return true;
}

/**
 * Scope Prisma query where clauses with tenant organizationId
 */
export function withTenantFilter<T extends Record<string, any>>(
  where: T,
  organizationId: string
): T & { organizationId: string } {
  return {
    ...where,
    organizationId,
  };
}
