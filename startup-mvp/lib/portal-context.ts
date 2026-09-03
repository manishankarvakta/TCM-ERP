import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface PortalContext {
  userId: string;
  userEmail: string;
  organizationId: string;
  clientId: string;
  portalUserId: string;
  permissions: string[];
}

/**
 * Server-side Client Portal Context Resolver.
 * FAIL-CLOSED SECURITY: Throws an explicit error if user is not registered or active.
 */
export async function getClientPortalContext(): Promise<PortalContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED: Authentication session required");
  }

  const userId = session.user.id;
  const userEmail = session.user.email || "";

  // Query PortalUser by userId
  const portalUser = await prisma.portalUser.findUnique({
    where: { userId },
    select: {
      id: true,
      organizationId: true,
      clientId: true,
      status: true,
      permissions: true,
    },
  });

  if (!portalUser) {
    throw new Error("UNAUTHORIZED_PORTAL_ACCESS: Not a registered client portal user");
  }

  if (portalUser.status !== "active") {
    throw new Error("REVOKED_PORTAL_ACCESS: Portal access has been revoked or is inactive");
  }

  // Parse permissions from Json
  const permissions: string[] = Array.isArray(portalUser.permissions)
    ? (portalUser.permissions as string[])
    : [];

  return {
    userId,
    userEmail,
    organizationId: portalUser.organizationId,
    clientId: portalUser.clientId,
    portalUserId: portalUser.id,
    permissions,
  };
}

/**
 * Verifies that the user has the required portal permission.
 */
export function verifyPortalPermission(context: PortalContext, permission: string): void {
  if (!context.permissions.includes(permission)) {
    throw new Error(`UNAUTHORIZED_PORTAL_ACTION: Missing permission ${permission}`);
  }
}

/**
 * Verifies that the record clientId matches the user's clientId.
 */
export function verifyClientAccess(context: PortalContext, recordClientId: string | null | undefined): void {
  if (!recordClientId || context.clientId !== recordClientId) {
    throw new Error("UNAUTHORIZED_CLIENT_ACCESS: Record belongs to another client");
  }
}
