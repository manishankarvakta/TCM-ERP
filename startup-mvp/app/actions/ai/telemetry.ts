"use server";

import { AnalyticsService } from "@/lib/system/analytics-service";
import { getEmployeePerformanceMetrics } from "@/app/actions/hr/performance.action";

export interface ProjectTelemetryContext {
    projectId: string;
    burndown: { totalEstimated: number; totalLogged: number; remaining: number };
    velocity: { name: string; velocity: number }[];
    teamWorkload: Record<string, any>;
    generatedAt: string;
}

/**
 * Enterprise AI Telemetry Grounding
 * Ensures the LLM cannot hallucinate by forcing it to ingest strict, real-time mathematical truths.
 */
export async function getProjectTelemetry(projectId: string, teamMemberIds: string[] = []): Promise<ProjectTelemetryContext> {
    
    // 1. Fetch Hard Mathematical Project Stats
    const burndown = await AnalyticsService.getProjectBurndown(projectId);
    const velocity = await AnalyticsService.getProjectVelocity(projectId);

    // 2. Fetch Deep Team Performance Metrics
    const teamWorkload: Record<string, any> = {};
    
    for (const employeeId of teamMemberIds) {
        const metrics = await getEmployeePerformanceMetrics(employeeId);
        if (metrics.success) {
            teamWorkload[employeeId] = {
                workloadPressure: metrics.data.workloadPressure,
                burnoutRisk: metrics.data.burnoutRisk,
                estimationAccuracy: metrics.data.estimationAccuracy
            };
        }
    }

    return {
        projectId,
        burndown,
        velocity,
        teamWorkload,
        generatedAt: new Date().toISOString()
    };
}
