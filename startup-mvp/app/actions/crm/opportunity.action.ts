"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, OpportunityStage } from "@prisma/client";

/**
 * Get paginated list of opportunities
 */
export async function getOpportunities(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  stage: OpportunityStage | "all" = "all"
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

    if (stage !== "all") {
      where.stage = stage;
    }

    const [total, opportunities] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        include: {
          // @ts-ignore
          Client: true,
          // @ts-ignore
          Contact: true,
          // @ts-ignore
          User: {
             select: { id: true, name: true, email: true }
          }
        },
        orderBy: { updatedAt: "desc" },
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
    }));

    return {
      success: true,
      opportunities: mappedOpportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
        Client: true,
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
    };

    return { success: true, opportunity: mappedOpportunity };
  } catch (error) {
    console.error("getOpportunityById error:", error);
    return { success: false, error: "Failed to fetch opportunity" };
  }
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
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.opportunities", "create"))) {
      return { success: false, error: "Permission Denied: crm.opportunities.create" };
    }

    // Validations
    if (!input.contactId) return { success: false, error: "A Contact is required for an Opportunity" };
    if (!input.value && input.value !== 0) return { success: false, error: "Opportunity Value is required" };
    if (!input.expectedCloseDate) return { success: false, error: "Expected Close Date is required" };

    const ownerId = input.ownerId || session.user.id;

    const opportunity = await prisma.opportunity.create({
      data: {
        ...input,
        ownerId,
        stage: OpportunityStage.DISCOVERY,
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

    await logItemCreated(session.user.id, "Opportunity", opportunity.id, opportunity.title, opportunity);
    revalidateBothPaths("crm/opportunities");

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
    };

    return { success: true, opportunity: mappedOpportunity };
  } catch (error) {
    console.error("createOpportunity error:", error);
    return { success: false, error: "Failed to create opportunity" };
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

    const opportunity = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { stage },
    });

    await logItemUpdated(session.user.id, "Opportunity", opportunityId, ["stage"], opportunity.title, { stage });
    revalidateBothPaths("crm/opportunities");

    return { success: true, opportunity };
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

    const opportunity = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { contactId },
    });

    await logItemUpdated(session.user.id, "Opportunity", opportunityId, ["contactId"], opportunity.title, { contactId });
    revalidateBothPaths("crm/opportunities");

    return { success: true, opportunity };
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

    const opportunity = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { value },
    });

    await logItemUpdated(session.user.id, "Opportunity", opportunityId, ["value"], opportunity.title, { value });
    revalidateBothPaths("crm/opportunities");

    return { success: true, opportunity };
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
        client: true,
        contact: true,
        owner: {
            select: { name: true, email: true }
        }
      },
      orderBy: { updatedAt: "asc" }
    });

    const mappedOpportunities = opportunities.map(o => ({
      ...o,
      value: o.value ? Number(o.value) : null,
      contact: o.contact ? {
        ...o.contact,
        name: `${o.contact.firstName} ${o.contact.lastName}`.trim()
      } : null
    }));

    return { success: true, opportunities: mappedOpportunities };
  } catch (error) {
    console.error("getOpportunitiesWithNoUpcomingActivity error:", error);
    return { success: false, error: "Failed to fetch stale opportunities", opportunities: [] };
  }
}
