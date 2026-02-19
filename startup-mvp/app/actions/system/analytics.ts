'use server'

import { AnalyticsService } from "@/lib/system/analytics-service";
import { checkSystemPermission } from "@/lib/system/permissions";
import { getCurrentUser } from "@/lib/session";

export async function getLeadStats() {
    const user = await getCurrentUser();
    if (!user) return null;
    if (!await checkSystemPermission('system.analytics', 'read')) return null;
    return await AnalyticsService.getLeadStats();
}

export async function getPipelineValue() {
    const user = await getCurrentUser();
    if (!user) return null;
    if (!await checkSystemPermission('system.analytics', 'read')) return null;
    return await AnalyticsService.getPipelineValue();
}

export async function getDealsByStage() {
    const user = await getCurrentUser();
    if (!user) return null;
    if (!await checkSystemPermission('system.analytics', 'read')) return null;
    return await AnalyticsService.getDealsByStage();
}

export async function getTasksDueToday() {
    const user = await getCurrentUser();
    if (!user) return null;
    // Task permission? Or Analytics permission?
    if (!await checkSystemPermission('system.tasks', 'read')) return null;
    return await AnalyticsService.getTasksDueToday();
}

export async function getOverdueActivities() {
    const user = await getCurrentUser();
    if (!user) return null;
    if (!await checkSystemPermission('system.analytics', 'read')) return null;
    return await AnalyticsService.getOverdueActivities();
}

export async function getConversionRate() {
    const user = await getCurrentUser();
    if (!user) return null;
    if (!await checkSystemPermission('system.analytics', 'read')) return null;
    return await AnalyticsService.getConversionRate();
}
