"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getProjectTelemetry } from "./telemetry";

export async function executeAiBalancer(projectId: string, teamMemberIds: string[]) {
    try {
        // 1. Fetch Workload Ground Truth
        const telemetry = await getProjectTelemetry(projectId, teamMemberIds);
        
        // 2. Execute Load Balancing AI
        const { object } = await generateObject({
            model: openai("gpt-4-turbo"),
            schema: z.object({
                reassignments: z.array(z.object({
                    fromEmployeeId: z.string(),
                    toEmployeeId: z.string(),
                    reasoning: z.string()
                })),
                efficiencyGainPercentage: z.number()
            }),
            system: `
                You are an Enterprise Workload Balancer.
                Analyze the provided team workload telemetry. Look specifically at 'workloadPressure'.
                If an employee's pressure ratio is > 1.2, they are mathematically guaranteed to burnout or fail.
                Suggest moving tasks from overloaded employees to employees with a ratio < 0.8.
                DO NOT invent fake employee IDs. Only use the IDs provided in the telemetry.
                
                TELEMETRY DATA:
                ${JSON.stringify(telemetry.teamWorkload, null, 2)}
            `,
            prompt: `Optimize the team's workload and suggest reassignments to prevent burnout.`
        });

        return { success: true, data: object };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
