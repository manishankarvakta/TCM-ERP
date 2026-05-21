"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getProjectTelemetry } from "./telemetry";

export async function executeAiPlanner(projectId: string, goalPrompt: string) {
    try {
        // 1. Fetch Mathematical Ground Truth
        const telemetry = await getProjectTelemetry(projectId);
        
        // 2. Strict AI Execution via Vercel AI SDK
        const { object } = await generateObject({
            model: openai("gpt-4-turbo"),
            schema: z.object({
                milestones: z.array(z.object({
                    title: z.string(),
                    description: z.string(),
                    tasks: z.array(z.object({
                        title: z.string(),
                        estimatedHours: z.number().describe("Must be realistic based on the provided historical velocity telemetry.")
                    }))
                }))
            }),
            system: `
                You are an Enterprise Project Planning AI. You do not chat. You generate exact task and milestone JSON structures.
                CRITICAL INSTRUCTION: You MUST review the provided TELEMETRY DATA.
                If the team's historical velocity is 40 hours/week, do not generate 300 hours of tasks for a 1-week milestone.
                Scale your estimatedHours based on their proven historical burn rates.
                
                TELEMETRY DATA:
                ${JSON.stringify(telemetry, null, 2)}
            `,
            prompt: `Break down the following project goal into logical milestones and tasks: "${goalPrompt}"`
        });

        return { success: true, data: object };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
