import React from "react";
import { notFound } from "next/navigation";
import { getTPNById } from "../_actions/tpn.action";
import TpnDetails from "../_components/tpn-details";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TpnDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const [result, org, dbUser, canApprove, canEdit, canMoveToTrash] = await Promise.all([
    getTPNById(id),
    prisma.organization.findFirst({
      where: { status: "active" }
    }),
    userId ? prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, defaultWarehouseId: true }
    }) : null,
    userId ? hasPermission(userId, "procurements.tpn", "approve") : Promise.resolve(false),
    userId ? hasPermission(userId, "procurements.tpn", "edit") : Promise.resolve(false),
    userId ? hasPermission(userId, "procurements.tpn", "move-to-trash") : Promise.resolve(false),
  ]);

  if (!result.success || !result.data) {
    if (result.error === "Failed to load TPN") {
      notFound();
    }
    return (
       <div className="p-8 text-center text-red-500">
          Error loading TPN: {result.error}
       </div>
    );
  }

  let finalOrg = org;
  if (!finalOrg) {
    const posSettingsRaw = await prisma.settings.findFirst({
      where: {
        code: "pos_settings",
        userId: null,
        isGlobal: true,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const posSettings = posSettingsRaw?.settings as any;
    finalOrg = {
      id: "default",
      name: posSettings?.headerText || "Ferrari Fashion",
      details: posSettings?.subHeaderText || "BIN 004601696-0102 | Mushak 6.3",
      address: null,
      phone: null,
      email: null,
      website: null,
      logo: null,
      status: "active",
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return (
    <PageGuard permissionKey="procurements.tpn" requiredOperation="view">
      <div className="flex-1 space-y-4">
        <TpnDetails
          tpn={result.data}
          organization={finalOrg}
          user={dbUser}
          permissions={{
            approve: canApprove,
            edit: canEdit,
            moveToTrash: canMoveToTrash,
          }}
        />
      </div>
    </PageGuard>
  );
}
