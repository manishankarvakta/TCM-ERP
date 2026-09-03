"use server";

import { SupportEntitlementType, SupportEntitlementStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function createSupportEntitlementAction(data: {
  organizationId: string;
  clientId: string;
  projectId?: string;
  agreementId?: string;
  name: string;
  type?: SupportEntitlementType;
  status?: SupportEntitlementStatus;
  startDate: Date;
  endDate: Date;
  coverageHours?: string;
  supportWindow?: string;
  notes?: string;
  createdById: string;
}) {
  try {
    const { organizationId, clientId, projectId, agreementId, name, startDate, endDate, createdById } = data;

    const client = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
    if (!client) {
      return { success: false, error: `Client ${clientId} not found or tenant boundary violated.` };
    }

    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
      if (!project) {
        return { success: false, error: `Project ${projectId} not found or tenant boundary violated.` };
      }
    }

    const entitlement = await prisma.supportEntitlement.create({
      data: {
        organizationId,
        clientId,
        projectId,
        agreementId,
        name,
        type: data.type || SupportEntitlementType.WARRANTY,
        status: data.status || SupportEntitlementStatus.ACTIVE,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        coverageHours: data.coverageHours,
        supportWindow: data.supportWindow,
        notes: data.notes,
        createdById
      }
    });

    return { success: true, data: entitlement };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSupportEntitlementAction(data: {
  organizationId: string;
  entitlementId: string;
  name?: string;
  status?: SupportEntitlementStatus;
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    const { organizationId, entitlementId } = data;

    const existing = await prisma.supportEntitlement.findFirst({ where: { id: entitlementId, organizationId } });
    if (!existing) {
      return { success: false, error: "Support entitlement not found or tenant boundary violated." };
    }

    const updated = await prisma.supportEntitlement.update({
      where: { id: entitlementId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {})
      }
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSupportEntitlementsAction(organizationId: string, clientId?: string) {
  try {
    const entitlements = await prisma.supportEntitlement.findMany({
      where: {
        organizationId,
        ...(clientId ? { clientId } : {})
      },
      include: {
        Client: { select: { id: true, name: true, email: true } },
        Project: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: entitlements };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
