"use server";

import { SupportTicketPriority } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function createSupportSLAPolicyAction(data: {
  organizationId: string;
  name: string;
  code: string;
  priority?: SupportTicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly?: boolean;
  timezone?: string;
  workingDays?: string;
  businessStartHour?: number;
  businessEndHour?: number;
  observeHolidays?: boolean;
  pauseOnWaitingClient?: boolean;
  pauseOnWaitingThirdParty?: boolean;
  createdById: string;
}) {
  try {
    const { organizationId, name, code, firstResponseMinutes, resolutionMinutes, createdById } = data;

    if (firstResponseMinutes <= 0 || resolutionMinutes <= 0) {
      return { success: false, error: "SLA response and resolution targets must be positive integers > 0." };
    }

    const policy = await prisma.supportSLAPolicy.create({
      data: {
        organizationId,
        name,
        code,
        priority: data.priority || SupportTicketPriority.MEDIUM,
        firstResponseMinutes,
        resolutionMinutes,
        businessHoursOnly: data.businessHoursOnly ?? true,
        timezone: data.timezone || "UTC",
        workingDays: data.workingDays || "1,2,3,4,5",
        businessStartHour: data.businessStartHour ?? 9,
        businessEndHour: data.businessEndHour ?? 17,
        observeHolidays: data.observeHolidays ?? true,
        pauseOnWaitingClient: data.pauseOnWaitingClient ?? true,
        pauseOnWaitingThirdParty: data.pauseOnWaitingThirdParty ?? true,
        createdById
      }
    });

    return { success: true, data: policy };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSupportSLAPolicyAction(data: {
  organizationId: string;
  policyId: string;
  name?: string;
  active?: boolean;
  firstResponseMinutes?: number;
  resolutionMinutes?: number;
  businessHoursOnly?: boolean;
  timezone?: string;
  workingDays?: string;
  businessStartHour?: number;
  businessEndHour?: number;
  observeHolidays?: boolean;
}) {
  try {
    const { organizationId, policyId } = data;

    const existing = await prisma.supportSLAPolicy.findFirst({ where: { id: policyId, organizationId } });
    if (!existing) {
      return { success: false, error: "Support SLA Policy not found or tenant boundary violated." };
    }

    const updated = await prisma.supportSLAPolicy.update({
      where: { id: policyId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.firstResponseMinutes ? { firstResponseMinutes: data.firstResponseMinutes } : {}),
        ...(data.resolutionMinutes ? { resolutionMinutes: data.resolutionMinutes } : {}),
        ...(data.businessHoursOnly !== undefined ? { businessHoursOnly: data.businessHoursOnly } : {}),
        ...(data.timezone ? { timezone: data.timezone } : {}),
        ...(data.workingDays ? { workingDays: data.workingDays } : {}),
        ...(data.businessStartHour !== undefined ? { businessStartHour: data.businessStartHour } : {}),
        ...(data.businessEndHour !== undefined ? { businessEndHour: data.businessEndHour } : {}),
        ...(data.observeHolidays !== undefined ? { observeHolidays: data.observeHolidays } : {})
      }
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSupportSLAPoliciesAction(organizationId: string) {
  try {
    const policies = await prisma.supportSLAPolicy.findMany({
      where: { organizationId },
      orderBy: { priority: "asc" }
    });

    return { success: true, data: policies };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
