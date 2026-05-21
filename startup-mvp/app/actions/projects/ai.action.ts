"use server";

import { auth } from "@/lib/auth";
import { generateProjectRiskAssessment } from "@/lib/ai/engine";

/**
 * Triggers the AI Project Risk Assessment.
 * Secure Server Action bridging the AI Engine to the frontend.
 */
export async function getAIRiskAssessment(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Execute the deterministic AI Engine
    // Note: This makes a synchronous HTTP call to the LLM. For massive queries, 
    // this should be moved inside a BullMQ job. For this phase, it's a direct await.
    const riskData = await generateProjectRiskAssessment(projectId);

    return {
      success: true,
      data: riskData
    };
  } catch (error: any) {
    console.error("[AI Advisor] getAIRiskAssessment error:", error);
    return { success: false, error: error.message || "Failed to generate AI Assessment" };
  }
}
