"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ProjectStatus } from "@prisma/client";
import { getGlobalFinancialControl } from "./financials.action";
import { broadcastProjectEvent } from "@/lib/system/realtime";

/**
 * STRICT STATE MACHINE: Safely transitions a project lifecycle stage
 */
export async function transitionProjectStatus(projectId: string, newStatus: ProjectStatus) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        if (!(await hasPermission(session.user.id, "projects.projects", "edit"))) {
            throw new Error("Permission Denied");
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { Milestones: { include: { Tasks: true } } }
        });

        if (!project) throw new Error("Project not found");

        // --- INTERLOCK RULES ---
        
        // Rule 1: Cannot go ACTIVE without Milestones
        if (newStatus === 'ACTIVE' && project.Milestones.length === 0) {
            return { success: false, error: "Cannot activate project: Zero milestones defined." };
        }

        // Rule 2: Cannot complete if any milestone or task is unfinished
        if (newStatus === 'COMPLETED') {
            const incompleteMilestones = project.Milestones.filter(m => m.status !== 'COMPLETED');
            if (incompleteMilestones.length > 0) {
                return { success: false, error: `Cannot complete project: Milestone '${incompleteMilestones[0].title}' is unfinished.` };
            }

            const allTasks = project.Milestones.flatMap(m => m.Tasks);
            const incompleteTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'done');
            if (incompleteTasks.length > 0) {
                return { success: false, error: `Cannot complete project: Task '${incompleteTasks[0].title}' is unfinished.` };
            }
        }

        // Apply transition
        await prisma.project.update({
            where: { id: projectId },
            data: { status: newStatus }
        });

        // Fire-and-Forget Realtime Broadcast
        broadcastProjectEvent(projectId, "PROJECT_UPDATED", {
            projectId,
            newStatus,
            timestamp: new Date().toISOString()
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Transition failed" };
    }
}

/**
 * MULTI-DIMENSIONAL HEALTH SCORING
 */
export async function getProjectHealth(projectId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        
        const canReadFinancials = await hasPermission(session.user.id, "projects.financials", "read");

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { 
                Milestones: { include: { Tasks: true, BlockedBy: true } },
                Tasks: { where: { milestoneId: null } }
            }
        });

        if (!project) throw new Error("Project not found");

        // 1. Completion Percentage
        let totalTasks = project.Tasks.length;
        let completedTasks = project.Tasks.filter(t => t.status === 'completed' || t.status === 'done').length;

        project.Milestones.forEach(m => {
            totalTasks += m.Tasks.length;
            completedTasks += m.Tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
        });

        const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // 2. Schedule Risk (Overdue milestones)
        const now = new Date();
        const overdueMilestones = project.Milestones.filter(m => m.dueDate && m.dueDate < now && m.status !== 'COMPLETED').length;
        const scheduleRisk = project.Milestones.length === 0 ? 0 : (overdueMilestones / project.Milestones.length) * 100;

        // 3. Blocker Risk (Milestone Dependencies)
        const blockedMilestones = project.Milestones.filter(m => m.BlockedBy.length > 0 && m.status !== 'COMPLETED').length;
        const blockerRisk = project.Milestones.length === 0 ? 0 : (blockedMilestones / project.Milestones.length) * 100;

        // 4. Financial Risk (Conditional RBAC)
        let financialRisk = 0;
        let hasFinancialData = false;
        
        if (canReadFinancials) {
            const financialRes = await getGlobalFinancialControl();
            if (financialRes.success && financialRes.data) {
                const projFin = financialRes.data.find((f: any) => f.id === projectId);
                if (projFin) {
                    financialRisk = Math.min(projFin.burnRatePercentage, 100);
                    hasFinancialData = true;
                }
            }
        }

        // Calculate Overall Health Score (0-100, where 100 is perfectly healthy)
        // If financials are available: 40% Schedule, 30% Blocker, 30% Financial
        // If NO financials: 60% Schedule, 40% Blocker
        let totalRiskScore = 0;
        if (hasFinancialData) {
            totalRiskScore = (scheduleRisk * 0.4) + (blockerRisk * 0.3) + (financialRisk * 0.3);
        } else {
            totalRiskScore = (scheduleRisk * 0.6) + (blockerRisk * 0.4);
        }

        const healthScore = Math.max(0, Math.round(100 - totalRiskScore));

        return {
            success: true,
            data: {
                completionPercentage,
                healthScore,
                metrics: {
                    scheduleRisk: Math.round(scheduleRisk),
                    blockerRisk: Math.round(blockerRisk),
                    financialRisk: hasFinancialData ? Math.round(financialRisk) : null
                }
            }
        };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Link a Milestone Dependency (Blocker -> Dependent)
 */
export async function linkMilestoneDependency(blockingId: string, dependentId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        if (!(await hasPermission(session.user.id, "projects.milestones", "edit"))) {
            throw new Error("Permission Denied");
        }

        if (blockingId === dependentId) throw new Error("Milestone cannot block itself");

        await prisma.milestoneDependency.create({
            data: { blockingId, dependentId }
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Failed to link milestone dependency" };
    }
}
