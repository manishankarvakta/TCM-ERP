import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getProjectPnL } from '../system/financials';
import { calculateCurrentWorkload, getBurnoutIndicators } from '../system/workload';
import { prisma } from '../prisma';

/**
 * AI Project Intelligence Engine
 * Generates deterministic Risk Assessments using structured ERP Telemetry.
 */

export async function generateProjectRiskAssessment(projectId: string) {
  // 1. Gather undeniable ERP Telemetry
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { Owner: true, ProjectManager: true }
  });

  if (!project) throw new Error("Project not found");

  const [pnl, activeIssues] = await Promise.all([
    getProjectPnL(projectId),
    prisma.issue.findMany({ where: { milestoneId: { not: "" }, status: "IN_PROGRESS" as any }, take: 10 })
  ]);

  // Gather Team Workload Data (To find bottleneck risks)
  // For MVP, we'll just pull a couple of active members related to the project
  const issueAssignees = [...new Set(activeIssues.map(i => i.assigneeId).filter(Boolean))];
  const teamWorkload = await Promise.all(
    issueAssignees.map(async (uid) => {
      // Find employee ID via User ID mapping
      const emp = await prisma.employee.findUnique({ where: { userId: uid as string } });
      if (!emp) return null;
      const workload = await calculateCurrentWorkload(emp.id);
      const burnout = await getBurnoutIndicators(emp.id);
      return { employeeId: emp.id, userId: uid, workload: workload.workloadRatio, burnoutRisks: burnout.length };
    })
  );

  const contextData = {
    projectName: project.title,
    status: project.status,
    financials: pnl,
    activeTeamRisks: teamWorkload.filter(Boolean),
    inProgressIssueCount: activeIssues.length
  };

  // 2. Feed structured data into the LLM and demand a strictly typed JSON response
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    system: `You are a Principal ERP Software Architect and Project Manager. 
You are analyzing absolute telemetry data from an ERP. Do NOT hallucinate. 
Calculate if the project will fail based on Burn Rate vs Gross Margin, and Team Overload vs Progress.
Always return structured JSON matching the provided schema.`,
    prompt: `Analyze the following ERP Telemetry and generate a risk prediction and resource optimization strategy: ${JSON.stringify(contextData)}`,
    schema: z.object({
      overallRiskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      delayProbabilityPercentage: z.number().min(0).max(100),
      financialHealthAnalysis: z.string(),
      workloadBottleneckAnalysis: z.string(),
      recommendedActions: z.array(z.string()).describe("3 actionable steps to optimize resources or save the budget")
    }),
  });

  return object;
}
