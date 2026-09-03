"use server";

import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import {
  getCeoCommandCenterData,
  getOrCreateCeoSettings,
  generateCeoDailySnapshot
} from "@/lib/ceo/ceo-command-center-engine";

/**
 * Server Action to fetch CEO Command Center Data.
 * Enforces strict server-side tenant authentication and authorization.
 * Caller organizationId overrides are REJECTED.
 */
export async function getCeoCommandCenterDataAction() {
  try {
    const tenant = await getTenantContext();

    const data = await getCeoCommandCenterData(tenant.organizationId);
    return { success: true, data };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Failed to fetch CEO Command Center data." };
  }
}

/**
 * Server Action to update Tenant Risk Threshold Settings.
 * Enforces server-side tenant authority and Decimal validation.
 */
export async function updateCeoCommandCenterSettingsAction(data: {
  arOverdueWarningDays?: number;
  approvalAgingThresholdHours?: number;
  projectMarginWarningPercent?: number | Decimal;
  projectOverdueWarningDays?: number;
  resourceUtilizationWarningPercent?: number | Decimal;
  slaCriticalityThresholdHours?: number;
  largeCrAmountThreshold?: number | Decimal;
  cashWarningThreshold?: number | Decimal;
}) {
  try {
    const tenant = await getTenantContext();

    const existing = await getOrCreateCeoSettings(tenant.organizationId);

    const updated = await prisma.ceoCommandCenterSettings.update({
      where: { organizationId: tenant.organizationId },
      data: {
        arOverdueWarningDays: data.arOverdueWarningDays ?? existing.arOverdueWarningDays,
        approvalAgingThresholdHours: data.approvalAgingThresholdHours ?? existing.approvalAgingThresholdHours,
        projectMarginWarningPercent: data.projectMarginWarningPercent
          ? new Decimal(data.projectMarginWarningPercent.toString())
          : existing.projectMarginWarningPercent,
        projectOverdueWarningDays: data.projectOverdueWarningDays ?? existing.projectOverdueWarningDays,
        resourceUtilizationWarningPercent: data.resourceUtilizationWarningPercent
          ? new Decimal(data.resourceUtilizationWarningPercent.toString())
          : existing.resourceUtilizationWarningPercent,
        slaCriticalityThresholdHours: data.slaCriticalityThresholdHours ?? existing.slaCriticalityThresholdHours,
        largeCrAmountThreshold: data.largeCrAmountThreshold
          ? new Decimal(data.largeCrAmountThreshold.toString())
          : existing.largeCrAmountThreshold,
        cashWarningThreshold: data.cashWarningThreshold
          ? new Decimal(data.cashWarningThreshold.toString())
          : existing.cashWarningThreshold
      }
    });

    return { success: true, data: updated };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Failed to update CEO Command Center settings." };
  }
}

/**
 * Server Action to generate or fetch daily CEO KPI snapshot.
 */
export async function generateCeoDailySnapshotAction() {
  try {
    const tenant = await getTenantContext();

    const snapshot = await generateCeoDailySnapshot(tenant.organizationId);
    return { success: true, data: snapshot };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Failed to generate daily CEO snapshot." };
  }
}

/**
 * Server Action to resolve an Executive Alert.
 */
export async function resolveCeoExecutiveAlertAction(data: { alertId: string }) {
  try {
    const tenant = await getTenantContext();

    const alert = await prisma.ceoExecutiveAlert.findFirst({
      where: { id: data.alertId, organizationId: tenant.organizationId }
    });

    if (!alert) {
      throw new Error("Executive alert not found or tenant boundary violated.");
    }

    const updated = await prisma.ceoExecutiveAlert.update({
      where: { id: data.alertId },
      data: {
        resolved: true,
        resolvedAt: new Date()
      }
    });

    return { success: true, data: updated };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Failed to resolve executive alert." };
  }
}
