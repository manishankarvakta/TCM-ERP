import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { dispatchOutboundWebhooks } from "./webhooks";
import { SupportTicketPriority, SupportTicketType, ApprovalSourceType, ApprovalRequestStatus } from "@prisma/client";
import type { AutomationRule, DomainOutboxEvent } from "@prisma/client";


interface Condition {
  field?: string;
  operator?: string;
  value?: unknown;
}

/**
 * Evaluates automation conditions against event payload
 */
export function evaluateConditions(conditions: unknown, payload: unknown): boolean {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true; // No conditions means always match
  }
  
  const payloadRecord = (payload && typeof payload === "object") ? (payload as Record<string, unknown>) : null;
  
  for (const cond of conditions as Condition[]) {
    const { field, operator, value } = cond;
    if (!field) continue;
    
    const payloadValue = payloadRecord?.[field];
    
    if (operator === "equals" && payloadValue !== value) return false;
    if (operator === "not_equals" && payloadValue === value) return false;
    if (operator === "contains" && (!payloadValue || !String(payloadValue).includes(String(value)))) return false;
    if (operator === "greater_than" && (payloadValue === undefined || (payloadValue as number) <= (value as number))) return false;
    if (operator === "less_than" && (payloadValue === undefined || (payloadValue as number) >= (value as number))) return false;
  }
  
  return true;
}

/**
 * Execute a specific action type through canonical ERP authorities
 */
export async function executeAutomationAction(
  organizationId: string,
  actionType: string,
  actionConfig: unknown,
  triggerEvent: { aggregateType: string; aggregateId: string; payload: unknown }
): Promise<unknown> {
  const config = (actionConfig && typeof actionConfig === "object") ? (actionConfig as Record<string, unknown>) : {};
  
  switch (actionType) {
    case "NOTIFICATION": {
      // Create canonical DB-backed Notification
      const userId = config.userId as string;
      const title = config.title as string;
      const message = config.message as string;
      if (!userId || !title) throw new Error("Missing notification config parameters");
      
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message: message || "",
          type: "SYSTEM",
          createdBy: "SYSTEM",
        },
      });
      return { notificationId: notification.id };
    }
    
    case "TASK": {
      // Create a task adhering to multitenancy
      const title = config.title as string;
      const description = config.description as string;
      const priority = config.priority as string;
      const assigneeId = config.assigneeId as string;
      if (!title) throw new Error("Missing task title");
      
      const task = await prisma.task.create({
        data: {
          organizationId,
          title,
          description: description || "",
          status: "todo",
          priority: priority || "medium",
          userId: "SYSTEM", // System assigned
          assigneeId: assigneeId || null,
          entityType: triggerEvent.aggregateType,
          entityId: triggerEvent.aggregateId,
        },
      });
      return { taskId: task.id };
    }
    
    case "TICKET": {
      // Phase 18 - Create support ticket
      const title = config.title as string;
      const description = config.description as string;
      const priority = config.priority as string;
      const type = config.type as string;
      const clientId = config.clientId as string;
      if (!title || !clientId) throw new Error("Missing support ticket parameters");
      
      // Load customer SLA entitlements to verify SLA rules apply
      const entitlement = await prisma.supportEntitlement.findFirst({
        where: { organizationId, clientId, status: "ACTIVE" },
      });
      
      const ticket = await prisma.supportTicket.create({
        data: {
          organizationId,
          clientId,
          title,
          description: description || "",
          priority: (priority || "MEDIUM") as SupportTicketPriority,
          type: (type || "INCIDENT") as SupportTicketType,
          status: "OPEN",
          entitlementId: entitlement?.id || null,
          ticketNumber: `TKT-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
          createdById: "SYSTEM",
        },
      });
      return { ticketId: ticket.id };
    }
    
    case "APPROVAL": {
      // Phase 15 - Trigger central approval flow
      const policyId = config.policyId as string;
      const requestedById = config.requestedById as string;
      if (!policyId) throw new Error("Missing approval policyId");
      
      const request = await prisma.approvalRequest.create({
        data: {
          organizationId,
          requestNumber: `APR-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
          policyId,
          sourceType: ApprovalSourceType.CHANGE_REQUEST,
          sourceId: triggerEvent.aggregateId,
          title: (config.title as string) || `Approval Request for ${triggerEvent.aggregateType}`,
          requestedById: requestedById || "SYSTEM",
          status: ApprovalRequestStatus.PENDING,
        },
      });
      return { approvalRequestId: request.id };
    }
    
    case "CRM_UPDATE": {
      // Safely update specific Opportunity or Lead fields (e.g. status/stage)
      const field = config.field as string;
      const value = config.value as string;
      if (!field || value === undefined) throw new Error("Missing CRM update parameters");
      
      const allowedFields = ["stage", "status", "probability", "confidenceLevel"];
      if (!allowedFields.includes(field)) {
        throw new Error(`Automation error: Mutating field ${field} is forbidden under CRM authority boundaries`);
      }
      
      if (triggerEvent.aggregateType === "Opportunity") {
        const opp = await prisma.opportunity.update({
          where: { id: triggerEvent.aggregateId, organizationId },
          data: { [field]: value },
        });
        return { updatedOpportunityId: opp.id };
      } else if (triggerEvent.aggregateType === "Lead") {
        const lead = await prisma.lead.update({
          where: { id: triggerEvent.aggregateId, organizationId },
          data: { [field]: value },
        });
        return { updatedLeadId: lead.id };
      } else {
        throw new Error(`Unsupported CRM aggregate type: ${triggerEvent.aggregateType}`);
      }
    }
    
    default:
      throw new Error(`Unsupported automation action type: ${actionType}`);
  }
}

/**
 * Process a single DomainOutboxEvent through matching automation rules
 */
export async function processOutboxEvent(eventId: string): Promise<number> {
  const event = await prisma.domainOutboxEvent.findUnique({
    where: { id: eventId },
  });
  
  if (!event) {
    throw new Error(`DomainOutboxEvent ${eventId} not found`);
  }
  
  if (event.publishedAt) {
    return 0; // Already published
  }
  
  const organizationId = event.organizationId;
  const eventType = event.eventType;
  const payload = event.payload;
  
  // 1. Dispatch to Webhooks
  await dispatchOutboundWebhooks(
    organizationId,
    eventId,
    eventType,
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null
  );
  
  // 2. Find and execute matching Automation Rules
  const rules = await prisma.automationRule.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      triggerType: "DOMAIN_EVENT",
    },
  });
  
  const matchedRules = rules.filter((rule: AutomationRule) => {
    const config = rule.triggerConfig as Record<string, unknown> | null;
    return config?.eventType === eventType || config?.eventType === "*";
  });
  
  let matchCount = 0;
  
  for (const rule of matchedRules) {
    if (!evaluateConditions(rule.conditions, payload)) {
      continue;
    }
    
    matchCount++;
    const idempotencyKey = `${event.id}_${rule.id}`;
    
    // Check if execution already exists (idempotency guard)
    const existing = await prisma.automationExecution.findUnique({
      where: { idempotencyKey },
    });
    
    if (existing) {
      continue;
    }
    
    // Create execution log in status RUNNING
    const execution = await prisma.automationExecution.create({
      data: {
        organizationId,
        automationRuleId: rule.id,
        ruleVersion: rule.version,
        triggerEventId: event.id,
        idempotencyKey,
        status: "RUNNING",
      },
    });
    
    try {
      const output = await executeAutomationAction(
        organizationId,
        rule.actionType,
        rule.actionConfig,
        event as unknown as DomainOutboxEvent
      );
      
      // Update execution status
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          outputSummary: JSON.stringify(output),
        },
      });
      
      // Write to audit log
      await prisma.userLog.create({
        data: {
          userId: "SYSTEM",
          action: "AUTOMATION_EXECUTE_SUCCESS",
          details: `Automation rule ${rule.name} executed successfully. Execution ID: ${execution.id}`,
        },
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      
      // Update execution failure log
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorCode: "EXECUTION_FAILED",
          errorSummary: errMsg.substring(0, 1000),
        },
      });
      
      // Write failed attempt to audit log
      await prisma.userLog.create({
        data: {
          userId: "SYSTEM",
          action: "AUTOMATION_EXECUTE_FAILED",
          details: `Automation rule ${rule.name} failed: ${errMsg}. Execution ID: ${execution.id}`,
        },
      });
    }
  }
  
  // Mark event as published
  await prisma.domainOutboxEvent.update({
    where: { id: eventId },
    data: {
      publishedAt: new Date(),
      attemptCount: { increment: 1 },
    },
  });
  
  return matchCount;
}
