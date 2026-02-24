"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, OpportunityStage } from "@prisma/client";
import { createActivity } from "./activity.action";
import { serializeData } from "@/lib/utils/serialization";

/**
 * Get paginated list of opportunities
 */
export async function getOpportunities(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  stage: string = "all",
  sortBy: string = "updatedAt",
  sortOrder: "asc" | "desc" = "desc",
  dateFrom?: string,
  dateTo?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", opportunities: [] };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "view"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.view", opportunities: [] };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.OpportunityWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    if (stage && stage !== "all") {
      where.stage = stage as OpportunityStage;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const start = new Date(dateFrom);
        if (!isNaN(start.getTime())) {
            start.setHours(0, 0, 0, 0);
            where.createdAt.gte = start;
        }
      }
      if (dateTo) {
        const end = new Date(dateTo);
        if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
      }
    }

    const orderBy: any = {};
    if (sortBy === "value") {
      orderBy.value = sortOrder;
    } else if (sortBy === "stage") {
      orderBy.stage = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [total, opportunities] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        include: {
          // @ts-ignore
          Client: {
            include: {
              Contact: true
            }
          },
          // @ts-ignore
          Contact: true,
          // @ts-ignore
          User: {
             select: { id: true, name: true, email: true, image: true }
          }
        },
        orderBy,
      }),
    ]);

    const mappedOpportunities = opportunities.map(o => ({
      ...o,
      value: o.value ? Number(o.value) : null,
      // @ts-ignore
      client: o.Client,
      // @ts-ignore
      contact: o.Contact ? {
        // @ts-ignore
        ...o.Contact,
        // @ts-ignore
        name: `${o.Contact.firstName} ${o.Contact.lastName}`.trim()
      } : null,
      // @ts-ignore
      owner: o.User,
      Client: undefined,
      Contact: undefined,
      User: undefined,
      opportunityNumber: o.opportunityNumber,
    }));

    return serializeData({
      success: true,
      opportunities: mappedOpportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getOpportunities error:", error);
    return { success: false, error: "Failed to fetch opportunities", opportunities: [] };
  }
}


/**
 * Get a single opportunity by ID
 */
export async function getOpportunityById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "view"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.view" };
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        // @ts-ignore
        Client: {
          include: {
            Contact: true
          }
        },
        // @ts-ignore
        Contact: true,
        // @ts-ignore
        User: {
            select: { name: true, email: true }
        }
      },
    });

    if (!opportunity) return { success: false, error: "Opportunity not found" };

    const mappedOpportunity = {
      ...opportunity,
      value: opportunity.value ? Number(opportunity.value) : null,
      // @ts-ignore
      client: opportunity.Client,
      // @ts-ignore
      contact: opportunity.Contact ? {
        // @ts-ignore
        ...opportunity.Contact,
        // @ts-ignore
        name: `${opportunity.Contact.firstName} ${opportunity.Contact.lastName}`.trim()
      } : null,
      // @ts-ignore
      owner: opportunity.User,
      Client: undefined,
      Contact: undefined,
      User: undefined,
      opportunityNumber: opportunity.opportunityNumber,
    };

    return serializeData({ success: true, opportunity: mappedOpportunity });
  } catch (error) {
    console.error("getOpportunityById error:", error);
    return { success: false, error: "Failed to fetch opportunity" };
  }
}

/**
 * Helper function to generate unique opportunity code
 * Format: OPP{NNNNNNN} (e.g., OPP1000001)
 */
export async function generateOpportunityCode(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OPP-${year}-`;
  const client = tx || prisma;

  // Find the highest existing code for current year
  const lastOpp = await client.opportunity.findFirst({
    where: {
      opportunityNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      opportunityNumber: "desc",
    },
    select: {
      opportunityNumber: true,
    },
  });
  console.log("generateOpportunityCode lastOpp:", lastOpp);

  let nextNumber = 1;
  if (lastOpp?.opportunityNumber) {
    const parts = lastOpp.opportunityNumber.split("-");
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSequence)) {
      nextNumber = lastSequence + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Create a new opportunity
 * RULES:
 * - Must have a Contact.
 * - Must have value.
 * - Must have expectedCloseDate.
 */
export async function createOpportunity(input: {
  title: string;
  clientId: string;
  contactId: string;
  value: number;
  expectedCloseDate: Date;
  ownerId?: string;
}) {
  const fs = require('fs');
  const logFile = 'debug_opportunity.log';
  const log = (msg: string) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`);

  try {
    log("Starting createOpportunity");
    const session = await auth();
    log(`Input: ${JSON.stringify(input)}`);
    
    if (!session?.user) {
        log("Unauthorized");
        return { success: false, error: "Unauthorized" };
    }

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "create"))) {
      log("Permission Denied");
      return { success: false, error: "Permission Denied: crm.opportunities.create" };
    }

    // Validations
    if (!input.contactId) return { success: false, error: "A Contact is required for an Opportunity" };
    if (!input.value && input.value !== 0) return { success: false, error: "Opportunity Value is required" };
    if (!input.expectedCloseDate) return { success: false, error: "Expected Close Date is required" };
    log("Validations passed");

    const ownerId = input.ownerId || session.user.id;

    const opportunity = await prisma.$transaction(async (tx) => {
      log("Starting transaction");
      let opportunityNumber = await generateOpportunityCode(tx);
      log(`Generated number: ${opportunityNumber}`);
      
      // Ensure code doesn't exist
      let codeExists = await tx.opportunity.findUnique({
        where: { opportunityNumber },
        select: { id: true }
      });

      // Retry logic
      let attempts = 0;
      while (codeExists && attempts < 5) {
        log(`Retry attempt: ${attempts}`);
        const parts = opportunityNumber.split("-");
        if (parts.length >= 3) {
             const sequenceStr = parts[parts.length - 1];
             const sequence = parseInt(sequenceStr, 10);
             if(!isNaN(sequence)) {
                  parts[parts.length - 1] = (sequence + 1).toString().padStart(4, "0");
                  opportunityNumber = parts.join("-");
             } else {
                  opportunityNumber = `OPP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
             }
        } else {
             // Fallback if unexpected format
             opportunityNumber = `OPP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        }
        codeExists = await tx.opportunity.findUnique({
            where: { opportunityNumber },
            select: { id: true }
        });
        attempts++;
      }

      log(`Creating record with number: ${opportunityNumber}`);
      return await tx.opportunity.create({
        data: {
          ...input,
          ownerId,
          stage: OpportunityStage.DISCOVERY,
          opportunityNumber,
        },
        include: {
          // @ts-ignore
          Client: true,
          // @ts-ignore
          Contact: true,
          // @ts-ignore
          User: true,
        },
      });
    });

    log(`Transaction committed, ID: ${opportunity.id}`);
    await logItemCreated(session.user.id, "Opportunity", opportunity.id, opportunity.title, opportunity);
    log("Logged item created");

    // Log to Timeline using emitSystemEvent
    const { emitSystemEvent } = await import("@/lib/system/hooks");
    await emitSystemEvent({
      entityType: "opportunity",
      entityId: opportunity.id,
      eventType: "OPPORTUNITY_CREATED",
      actorId: session.user.id,
      description: `Opportunity created: ${opportunity.title}`,
      metadata: { 
        value: input.value,
        contactId: input.contactId
      }
    });
    revalidateBothPaths("crm/opportunities");
    log("Revalidated");

    const mappedOpportunity = {
      ...opportunity,
      value: opportunity.value ? Number(opportunity.value) : null,
      // @ts-ignore
      client: opportunity.Client,
      // @ts-ignore
      contact: opportunity.Contact ? {
        // @ts-ignore
        ...opportunity.Contact,
        // @ts-ignore
        name: `${opportunity.Contact.firstName} ${opportunity.Contact.lastName}`.trim()
      } : null,
      // @ts-ignore
      owner: opportunity.User,
      Client: undefined,
      Contact: undefined,
      User: undefined,
      opportunityNumber: opportunity.opportunityNumber,
    };

    return serializeData({ success: true, opportunity: mappedOpportunity });
  } catch (error: any) {
    log(`Error: ${error.message || JSON.stringify(error)}`);
    return { success: false, error: `Failed to create opportunity: ${error.message || JSON.stringify(error)}` };
  }
}

/**
 * Update general opportunity details
 */
export async function updateOpportunity(id: string, input: {
  title?: string;
  clientId?: string;
  contactId?: string;
  value?: number;
  expectedCloseDate?: Date;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "edit"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.edit" };
    }

    // Get old data for logging
    const oldOpp = await prisma.opportunity.findUnique({
      where: { id },
      include: { Contact: true }
    });

    if (!oldOpp) return { success: false, error: "Opportunity not found" };

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: input,
    });

    await logItemUpdated(session.user.id, "Opportunity", id, Object.keys(input), opportunity.title, input);

    // structured change tracking
    const changes: any[] = [];
    
    if (input.title && input.title !== oldOpp.title) {
        changes.push({ field: "title", from: oldOpp.title, to: input.title });
    }
    
    if (input.value !== undefined && input.value !== Number(oldOpp.value)) {
        changes.push({ field: "value", from: Number(oldOpp.value), to: input.value });
    }

    if (input.expectedCloseDate && oldOpp.expectedCloseDate && input.expectedCloseDate.getTime() !== oldOpp.expectedCloseDate.getTime()) {
        changes.push({ field: "expectedCloseDate", from: oldOpp.expectedCloseDate.toISOString(), to: input.expectedCloseDate.toISOString() });
    }

    if (changes.length > 0) {
        const { emitSystemEvent } = await import("@/lib/system/hooks");
        await emitSystemEvent({
            entityType: "opportunity",
            entityId: id,
            eventType: "OPPORTUNITY_UPDATED",
            actorId: session.user.id,
            description: `Opportunity details updated`,
            metadata: { changes }
        });
    }

    revalidateBothPaths("crm/opportunities");
    revalidateBothPaths(`crm/opportunities/${id}`);

    return serializeData({ success: true, opportunity });
  } catch (error) {
    console.error("updateOpportunity error:", error);
    return { success: false, error: "Failed to update opportunity" };
  }
}

/**
 * Update opportunity stage
 */
export async function updateOpportunityStage(opportunityId: string, stage: OpportunityStage) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "edit"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.edit" };
    }

    // Get old stage
    const oldOpp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { stage: true, contactId: true }
    });

    const opportunity = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { stage },
    });

    await logItemUpdated(session.user.id, "Opportunity", opportunityId, ["stage"], opportunity.title, { stage });
    
    // Log to Timeline
    if (oldOpp && oldOpp.stage !== stage) {
        const { emitSystemEvent } = await import("@/lib/system/hooks");
        await emitSystemEvent({
            entityType: "opportunity",
            entityId: opportunityId,
            eventType: "OPPORTUNITY_STAGE_CHANGED",
            actorId: session.user.id,
            description: `Stage changed to ${stage}`,
            metadata: { 
                changes: [{ field: "stage", from: oldOpp.stage, to: stage }]
            }
        });
    }

    revalidateBothPaths("crm/opportunities");

    return serializeData({ success: true, opportunity });
  } catch (error) {
    console.error("updateOpportunityStage error:", error);
    return { success: false, error: "Failed to update opportunity stage" };
  }
}

/**
 * Attach or change contact for an opportunity
 */
export async function attachContactToOpportunity(opportunityId: string, contactId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "edit"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.edit" };
    }

    // Get old contact
    const oldOpp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { contactId: true }
    });

    const opportunity = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { contactId },
    });

    await logItemUpdated(session.user.id, "Opportunity", opportunityId, ["contactId"], opportunity.title, { contactId });
    
    // Log activity
    const { emitSystemEvent } = await import("@/lib/system/hooks");
    await emitSystemEvent({
        entityType: "opportunity",
        entityId: opportunityId,
        eventType: "OPPORTUNITY_UPDATED",
        actorId: session.user.id,
        description: `Primary contact updated`,
        metadata: { 
            changes: [{ field: "contactId", from: oldOpp?.contactId, to: contactId }]
        }
    });

    revalidateBothPaths("crm/opportunities");

    return serializeData({ success: true, opportunity });
  } catch (error) {
    console.error("attachContactToOpportunity error:", error);
    return { success: false, error: "Failed to update opportunity contact" };
  }
}

/**
 * Update opportunity value
 */
export async function updateOpportunityValue(opportunityId: string, value: number) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "edit"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.edit" };
    }

    // Get old value
    const oldOpp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { value: true, contactId: true }
    });

    const opportunity = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { value },
    });

    await logItemUpdated(session.user.id, "Opportunity", opportunityId, ["value"], opportunity.title, { value });
    
    // Log activity
    if (oldOpp && Number(oldOpp.value) !== value) {
        const { emitSystemEvent } = await import("@/lib/system/hooks");
        await emitSystemEvent({
            entityType: "opportunity",
            entityId: opportunityId,
            eventType: "OPPORTUNITY_UPDATED",
            actorId: session.user.id,
            description: `Value updated to ${value}`,
            metadata: { 
                changes: [{ field: "value", from: Number(oldOpp.value), to: value }]
            }
        });
    }

    revalidateBothPaths("crm/opportunities");

    return serializeData({ success: true, opportunity });
  } catch (error) {
    console.error("updateOpportunityValue error:", error);
    return { success: false, error: "Failed to update opportunity value" };
  }
}

/**
 * Mark opportunity as WON
 */
export async function markOpportunityWon(opportunityId: string) {
  return updateOpportunityStage(opportunityId, OpportunityStage.WON);
}

/**
 * Mark opportunity as LOST
 */
export async function markOpportunityLost(opportunityId: string) {
  return updateOpportunityStage(opportunityId, OpportunityStage.LOST);
}

/**
 * Get opportunities with no upcoming activity (stale deals)
 */
export async function getOpportunitiesWithNoUpcomingActivity() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", opportunities: [] };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "view"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.view", opportunities: [] };
    }

    const now = new Date();

    const opportunities = await prisma.opportunity.findMany({
      where: {
        OR: [
          { nextActivityAt: null },
          { nextActivityAt: { lt: now } },
        ],
        NOT: [
            { stage: OpportunityStage.WON },
            { stage: OpportunityStage.LOST }
        ]
      },
      include: {
        // @ts-ignore
        Client: true,
        // @ts-ignore
        Contact: true,
        // @ts-ignore
        User: {
            select: { name: true, email: true }
        }
      },
      orderBy: { updatedAt: "asc" }
    });

    const mappedOpportunities = opportunities.map(o => ({
      ...o,
      value: o.value ? Number(o.value) : null,
      // @ts-ignore
      contact: o.Contact ? {
        // @ts-ignore
        ...o.Contact,
        // @ts-ignore
        name: `${o.Contact.firstName} ${o.Contact.lastName}`.trim()
      } : null,
      opportunityNumber: o.opportunityNumber,
    }));

    return serializeData({ success: true, opportunities: mappedOpportunities });
  } catch (error) {
    console.error("getOpportunitiesWithNoUpcomingActivity error:", error);
    return { success: false, error: "Failed to fetch stale opportunities", opportunities: [] };
  }
}
