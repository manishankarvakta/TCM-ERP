"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getProjectTelemetry } from "./telemetry";

export async function executeAiRiskPrediction(projectId: string) {
    try {
        // 1. Fetch Mathematical Ground Truth
        const telemetry = await getProjectTelemetry(projectId);
        
        // 2. Execute Risk AI
        const { object } = await generateObject({
            model: openai("gpt-4-turbo"),
            schema: z.object({
                riskAlerts: z.array(z.object({
                    severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
                    reasoning: z.string(),
                    recommendedAction: z.string()
                })),
                overallProjectHealthScore: z.number().min(0).max(100)
            }),
            system: `
                You are an Enterprise Risk Prediction Engine. 
                Analyze the provided TELEMETRY DATA and identify any mathematical certainty of failure.
                If the team has 500 estimated hours remaining but historical velocity proves they only burn 40 hours/week, 
                and the project is due in 2 weeks, you MUST flag a CRITICAL delay risk.
                
                TELEMETRY DATA:
                ${JSON.stringify(telemetry, null, 2)}
            `,
            prompt: `Run a full delay and bottleneck prediction sweep on this project telemetry.`
        });

        return { success: true, data: object };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
