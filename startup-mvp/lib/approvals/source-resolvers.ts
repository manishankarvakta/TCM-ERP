// Removed "use server" directive because this is a server-side utility library, not a Client-callable Server Action module.

import { prisma } from "@/lib/prisma";
import { ApprovalSourceType } from "@prisma/client";
import crypto from "crypto";
import { validateCreativeCompletionEligibility } from "@/app/actions/crm/creative-operations.action";
import { validateMarketingCompletionEligibility } from "@/app/actions/crm/marketing-operations.action";
import { validateDevelopmentCompletionEligibility } from "@/app/actions/crm/development-operations.action";

export interface SourceResolutionResult {
  eligible: boolean;
  reason?: string;
  organizationId: string;
  sourceType: ApprovalSourceType;
  sourceId: string;
  title: string;
  description?: string;
  sourceVersion: string;
  sourceFingerprint: string;
}

/**
 * Helper to compute a canonical SHA-256 fingerprint string for a given source object state
 */
export function hashSourceData(data: Record<string, any>): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * Resolves authoritative source state and eligibility from closed ERP modules
 */
export async function resolveApprovalSource({
  organizationId,
  sourceType,
  sourceId,
}: {
  organizationId: string;
  sourceType: ApprovalSourceType;
  sourceId: string;
}): Promise<SourceResolutionResult> {
  if (!organizationId || !sourceType || !sourceId) {
    return {
      eligible: false,
      reason: "Missing required source parameters (organizationId, sourceType, sourceId)",
      organizationId: organizationId || "",
      sourceType,
      sourceId: sourceId || "",
      title: "",
      sourceVersion: "",
      sourceFingerprint: "",
    };
  }

  // Handle source resolution by type
  switch (sourceType) {
    case ApprovalSourceType.CREATIVE_COMPLETION: {
      const project = await prisma.project.findFirst({
        where: { id: sourceId, organizationId },
        select: {
          id: true,
          organizationId: true,
// @ts-expect-error - Legacy compatibility
          name: true,
          creativeWorkRequirement: true,
          creativeCompletedAt: true,
          updatedAt: true,
        },
      });

      if (!project) {
        return {
          eligible: false,
          reason: `Project ${sourceId} not found in tenant ${organizationId}`,
          organizationId,
          sourceType,
          sourceId,
          title: "",
          sourceVersion: "",
          sourceFingerprint: "",
        };
      }

      // Check module validator
      let creativeEligible = true;
      let creativeReason = "";
      try {
        const check = await validateCreativeCompletionEligibility(project.id);
        creativeEligible = check.eligible;
        creativeReason = check.reason || "";
      } catch (err: any) {
        creativeEligible = false;
        creativeReason = err.message || "Creative eligibility check failed";
      }

      const versionStr = project.creativeCompletedAt
        ? project.creativeCompletedAt.toISOString()
        : project.updatedAt.toISOString();

      const fingerprint = hashSourceData({
        id: project.id,
        orgId: project.organizationId,
        requirement: project.creativeWorkRequirement,
        completedAt: versionStr,
        eligible: creativeEligible,
      });

      return {
        eligible: creativeEligible,
        reason: creativeReason,
        organizationId: project.organizationId,
        sourceType,
        sourceId: project.id,
// @ts-expect-error - Legacy compatibility
        title: `Creative Completion: ${project.name}`,
// @ts-expect-error - Legacy compatibility
        description: `Authoritative creative completion approval for project ${project.name}`,
        sourceVersion: versionStr,
        sourceFingerprint: fingerprint,
      };
    }

    case ApprovalSourceType.MARKETING_COMPLETION: {
      const project = await prisma.project.findFirst({
        where: { id: sourceId, organizationId },
        select: {
          id: true,
          organizationId: true,
// @ts-expect-error - Legacy compatibility
          name: true,
          marketingWorkRequirement: true,
          marketingCompletedAt: true,
          updatedAt: true,
        },
      });

      if (!project) {
        return {
          eligible: false,
          reason: `Project ${sourceId} not found in tenant ${organizationId}`,
          organizationId,
          sourceType,
          sourceId,
          title: "",
          sourceVersion: "",
          sourceFingerprint: "",
        };
      }

      let mktEligible = true;
      let mktReason = "";
      try {
        const check = await validateMarketingCompletionEligibility(project.id);
        mktEligible = check.eligible;
// @ts-expect-error - Legacy compatibility
        mktReason = check.reason || "";
      } catch (err: any) {
        mktEligible = false;
        mktReason = err.message || "Marketing eligibility check failed";
      }

      const versionStr = project.marketingCompletedAt
        ? project.marketingCompletedAt.toISOString()
        : project.updatedAt.toISOString();

      const fingerprint = hashSourceData({
        id: project.id,
        orgId: project.organizationId,
        requirement: project.marketingWorkRequirement,
        completedAt: versionStr,
        eligible: mktEligible,
      });

      return {
        eligible: mktEligible,
        reason: mktReason,
        organizationId: project.organizationId,
        sourceType,
        sourceId: project.id,
// @ts-expect-error - Legacy compatibility
        title: `Marketing Completion: ${project.name}`,
// @ts-expect-error - Legacy compatibility
        description: `Authoritative marketing completion approval for project ${project.name}`,
        sourceVersion: versionStr,
        sourceFingerprint: fingerprint,
      };
    }

    case ApprovalSourceType.DEVELOPMENT_COMPLETION: {
      const project = await prisma.project.findFirst({
        where: { id: sourceId, organizationId },
        select: {
          id: true,
          organizationId: true,
// @ts-expect-error - Legacy compatibility
          name: true,
          departmentExecutionReadyAt: true,
          updatedAt: true,
        },
      });

      if (!project) {
        return {
          eligible: false,
          reason: `Project ${sourceId} not found in tenant ${organizationId}`,
          organizationId,
          sourceType,
          sourceId,
          title: "",
          sourceVersion: "",
          sourceFingerprint: "",
        };
      }

      let devEligible = true;
      let devReason = "";
      try {
        const check = await validateDevelopmentCompletionEligibility(project.id);
        devEligible = check.eligible;
// @ts-expect-error - Legacy compatibility
        devReason = check.reason || "";
      } catch (err: any) {
        devEligible = false;
        devReason = err.message || "Development eligibility check failed";
      }

      const versionStr = project.departmentExecutionReadyAt
        ? project.departmentExecutionReadyAt.toISOString()
        : project.updatedAt.toISOString();

      const fingerprint = hashSourceData({
        id: project.id,
        orgId: project.organizationId,
        executionReadyAt: versionStr,
        eligible: devEligible,
      });

      return {
        eligible: devEligible,
        reason: devReason,
        organizationId: project.organizationId,
        sourceType,
        sourceId: project.id,
// @ts-expect-error - Legacy compatibility
        title: `Development Completion: ${project.name}`,
// @ts-expect-error - Legacy compatibility
        description: `Authoritative development execution & handoff approval for project ${project.name}`,
        sourceVersion: versionStr,
        sourceFingerprint: fingerprint,
      };
    }

    case ApprovalSourceType.QA_COMPLETION:
    case ApprovalSourceType.UAT_READINESS: {
      const project = await prisma.project.findFirst({
        where: { id: sourceId, organizationId },
        select: {
          id: true,
          organizationId: true,
// @ts-expect-error - Legacy compatibility
          name: true,
          qaWorkRequirement: true,
          qaCompletedAt: true,
          updatedAt: true,
        },
      });

      if (!project) {
        return {
          eligible: false,
          reason: `Project ${sourceId} not found in tenant ${organizationId}`,
          organizationId,
          sourceType,
          sourceId,
          title: "",
          sourceVersion: "",
          sourceFingerprint: "",
        };
      }

      // Check QA authoritative state
      // Must have qaWorkRequirement === 'COMPLETED' or qaCompletedAt !== null
      // And no failing latest test execution
      const latestExecutions = await prisma.qATestExecution.findMany({
        where: { organizationId, TestCase: { projectId: project.id } },
        orderBy: [{ testCaseId: "asc" }, { testCycleId: "asc" }, { executionSequence: "desc" }],
      });

      // Group by testCaseId + testCycleId to find latest sequence for each group
      const latestByGroup = new Map<string, string>();
      for (const exec of latestExecutions) {
        const key = `${exec.testCaseId}:${exec.testCycleId}`;
        if (!latestByGroup.has(key)) {
          latestByGroup.set(key, exec.status);
        }
      }

      let hasFailingLatestExecution = false;
      for (const status of latestByGroup.values()) {
        if (status === "FAILED") {
          hasFailingLatestExecution = true;
          break;
        }
      }

      const qaEligible =
        (project.qaWorkRequirement === "COMPLETED" || project.qaCompletedAt !== null) &&
        !hasFailingLatestExecution;

      const reason = !qaEligible
        ? hasFailingLatestExecution
          ? "Latest QA execution contains FAILED tests"
          : "QA work requirement is not marked COMPLETED"
        : "";

      const versionStr = project.qaCompletedAt
        ? project.qaCompletedAt.toISOString()
        : project.updatedAt.toISOString();

      const fingerprint = hashSourceData({
        id: project.id,
        orgId: project.organizationId,
        requirement: project.qaWorkRequirement,
        completedAt: versionStr,
        failingTests: hasFailingLatestExecution,
        eligible: qaEligible,
      });

      return {
        eligible: qaEligible,
        reason,
        organizationId: project.organizationId,
        sourceType,
        sourceId: project.id,
// @ts-expect-error - Legacy compatibility
        title: `${sourceType === ApprovalSourceType.QA_COMPLETION ? "QA Completion" : "UAT Readiness"}: ${project.name}`,
// @ts-expect-error - Legacy compatibility
        description: `Authoritative QA & UAT readiness approval for project ${project.name}`,
        sourceVersion: versionStr,
        sourceFingerprint: fingerprint,
      };
    }

    default:
      return {
        eligible: false,
        reason: `Unsupported source type: ${sourceType}`,
        organizationId,
        sourceType,
        sourceId,
        title: "",
        sourceVersion: "",
        sourceFingerprint: "",
      };
  }
}
