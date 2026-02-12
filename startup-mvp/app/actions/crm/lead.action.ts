"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, LeadStatus, OpportunityStage } from "@prisma/client";

/**
 * Get paginated list of leads
 */
export async function getLeads(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: LeadStatus | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", leads: [] };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "view"))) {
      return { success: false, error: "Permission Denied: crm.leads.view", leads: [] };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.LeadWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status !== "all") {
      where.status = status;
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getLeads error:", error);
    return { success: false, error: "Failed to fetch leads", leads: [] };
  }
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "view"))) {
      return { success: false, error: "Permission Denied: crm.leads.view" };
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, name: true, email: true, image: true } },
      }
    });

    if (!lead) return { success: false, error: "Lead not found" };

    return {
      success: true,
      lead: {
        ...lead,
        owner: lead.User,
        User: undefined,
      },
    };
  } catch (error) {
    console.error("getLeadById error:", error);
    return { success: false, error: "Failed to fetch lead" };
  }
}

/**
 * Create a new lead with validation
 * Rules:
 * - owner is required (defaults to current user if not provided)
 * - validate email/phone presence (at least one must be provided)
 */
export async function createLead(input: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  ownerId?: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "create"))) {
      return { success: false, error: "Permission Denied: crm.leads.create" };
    }

    // Validate email/phone presence
    if (!input.email && !input.phone) {
      return { success: false, error: "Either Email or Phone is required for a Lead" };
    }

    // Destructure to separate lead data from extra info like notes
    const { notes, ownerId: providedOwnerId, ...leadData } = input;
    const ownerId = providedOwnerId || session.user.id;

    const lead = await prisma.lead.create({
      data: {
        ...leadData,
        ownerId,
      },
    });

    // If notes are provided, create an initial activity for this lead
    if (notes) {
      await prisma.activity.create({
        data: {
          type: "Note",
          subject: "Initial Lead Note",
          description: notes,
          leadId: lead.id,
          ownerId: session.user.id,
        },
      });
    }

    await logItemCreated(session.user.id, "Lead", lead.id, lead.name, lead);
    revalidateBothPaths("crm/leads");

    return { success: true, lead };
  } catch (error) {
    console.error("createLead error:", error);
    return { success: false, error: "Failed to create lead" };
  }
}

/**
 * Assign or change lead owner
 */
export async function assignLeadOwner(leadId: string, ownerId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "edit"))) {
      return { success: false, error: "Permission Denied: crm.leads.edit" };
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { ownerId },
    });

    await logItemUpdated(session.user.id, "Lead", leadId, ["ownerId"], lead.name, { ownerId });
    revalidateBothPaths("crm/leads");

    return { success: true, lead };
  } catch (error) {
    console.error("assignLeadOwner error:", error);
    return { success: false, error: "Failed to assign lead owner" };
  }
}

/**
 * Update lead status
 * Rule: status must use enum
 */
export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "edit"))) {
      return { success: false, error: "Permission Denied: crm.leads.edit" };
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    await logItemUpdated(session.user.id, "Lead", leadId, ["status"], lead.name, { status });
    revalidateBothPaths("crm/leads");

    return { success: true, lead };
  } catch (error) {
    console.error("updateLeadStatus error:", error);
    return { success: false, error: "Failed to update lead status" };
  }
}

/**
 * Log activity for a lead
 */
export async function logLeadActivity(leadId: string, input: {
  type: string;
  subject: string;
  description?: string;
  dueDate?: Date;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "create"))) {
      return { success: false, error: "Permission Denied: crm.activities.create" };
    }

    const activity = await prisma.activity.create({
      data: {
        ...input,
        leadId,
        ownerId: session.user.id,
      },
    });

    revalidateBothPaths("crm/leads");
    return { success: true, activity };
  } catch (error) {
    console.error("logLeadActivity error:", error);
    return { success: false, error: "Failed to log lead activity" };
  }
}

/**
 * Convert lead to Client, Contact, and Opportunity
 * Alias for convertLeadToOpportunity
 */
export async function convertLead(leadId: string, input: {
  opportunityTitle: string;
  opportunityValue?: number;
  expectedCloseDate?: Date;
}) {
  return convertLeadToOpportunity(leadId, input);
}

/**
 * Actual implementation of lead conversion
 * Runs inside prisma.$transaction
 */
export async function convertLeadToOpportunity(leadId: string, input: {
  opportunityTitle: string;
  opportunityValue?: number;
  expectedCloseDate?: Date;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    // Conversion requires creating opportunities and editing leads
    if (!(await checkPermission(session.user.id, "crm.leads", "edit")) || 
        !(await checkPermission(session.user.id, "crm.opportunities", "create"))) {
      return { success: false, error: "Permission Denied: crm.leads.edit and crm.opportunities.create required" };
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) return { success: false, error: "Lead not found" };
    if (lead.status === LeadStatus.CONVERTED) return { success: false, error: "Lead already converted" };

    // Transaction to ensure atomic conversion
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or Find Client (Account)
      let client = await tx.client.findFirst({
        where: { email: lead.email }
      });

      if (!client) {
        // Generate Client Code
        const prefix = "CLI";
        const lastClient = await tx.client.findFirst({
          where: { clientCode: { startsWith: prefix } },
          orderBy: { clientCode: "desc" },
          select: { clientCode: true },
        });

        let nextNumber = 1000001;
        if (lastClient?.clientCode) {
          const lastNumber = parseInt(lastClient.clientCode.replace(prefix, ""), 10);
          if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        const clientCode = `${prefix}${nextNumber.toString().padStart(7, "0")}`;

        client = await tx.client.create({
          data: {
            name: lead.company || lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            clientCode,
            createdBy: session.user.id,
            status: "active",
          }
        });
      }

      // 2. Create Primary Contact linked to Client
      const nameParts = lead.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "Contact";

      const contact = await tx.contact.create({
        data: {
          firstName,
          lastName,
          email: lead.email,
          phone: lead.phone,
          clientId: client.id,
          isPrimary: true,
          role: "Decision Maker",
        }
      });

      // 3. Create Opportunity linked to Client
      const opportunity = await tx.opportunity.create({
        data: {
          title: input.opportunityTitle,
          value: input.opportunityValue,
          expectedCloseDate: input.expectedCloseDate,
          clientId: client.id,
          contactId: contact.id,
          stage: OpportunityStage.DISCOVERY,
          ownerId: session.user.id,
        }
      });

      // 4. Mark Lead as Converted
      await tx.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.CONVERTED }
      });

      return { opportunityId: opportunity.id };
    });

    await logItemUpdated(session.user.id, "Lead", leadId, ["status"], lead.name, { status: LeadStatus.CONVERTED });
    
    revalidateBothPaths("crm/leads");
    revalidateBothPaths("crm/opportunities");
    revalidateBothPaths("clients");

    return { success: true, opportunityId: result.opportunityId };
  } catch (error) {
    console.error("convertLeadToOpportunity error:", error);
    return { success: false, error: "Failed to convert lead to opportunity" };
  }
}

/**
 * Get all users who can own leads
 */
export async function getLeadOwners() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", owners: [] };

    // Simply fetch all users for now, or filter by role/permission if preferred
    const owners = await prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { success: true, owners };
  } catch (error) {
    console.error("getLeadOwners error:", error);
    return { success: false, error: "Failed to fetch lead owners", owners: [] };
  }
}
