"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { createNotification } from "@/app/actions/notificationActions";
import { type Prisma, LeadStatus, OpportunityStage, NotificationType } from "@prisma/client";

/**
 * Generate unique lead number
 * Format: LEAD-YYYY-XXXX (e.g., LEAD-2025-0001)
 */
export async function generateLeadNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LEAD-${year}-`;
  
  const lastLead = await prisma.lead.findFirst({
    where: {
      leadNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      leadNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastLead && lastLead.leadNumber) {
    const lastNumber = parseInt(lastLead.leadNumber.split('-').pop() || '0');
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

/**
 * Get paginated list of leads
 */
export async function getLeads(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all", // Changed to string for flexibility
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
  dateFrom?: string, // Changed to string
  dateTo?: string,    // Changed to string
  includeTrash: boolean = false,
  ownerId?: string,
  categoryId?: string,
  source?: string
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
    const where: Prisma.LeadWhereInput = {
      isTrash: includeTrash // Filter by trash status
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { leadNumber: { contains: search, mode: "insensitive" } },
        { website: { contains: search, mode: "insensitive" } },
        { facebook: { contains: search, mode: "insensitive" } },
      ] as any;
    }

    if (status && status !== "all") {
      where.status = status as LeadStatus;
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

    if (ownerId && ownerId !== "all") {
      where.ownerId = ownerId;
    }

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    if (source && source !== "all") {
      where.source = source;
    }

    const orderBy: any = {};
    if (sortBy === "status") {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          Category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Format leads to include owner name more conveniently and fetch connected opportunities for converted leads
    const convertedLeadIds = leads.filter(l => l.status === "CONVERTED").map(l => l.id);
    const activities = convertedLeadIds.length > 0 ? await prisma.activity.findMany({
      where: {
        contextType: "lead",
        contextId: { in: convertedLeadIds },
        type: "LEAD_CONVERTED"
      }
    }) : [];

    const oppIdToLeadId: Record<string, string> = {};
    const oppIds: string[] = [];
    activities.forEach(act => {
      const meta = act.metadata as any;
      if (meta && meta.opportunityId) {
        oppIds.push(meta.opportunityId);
        oppIdToLeadId[meta.opportunityId] = act.contextId!;
      }
    });

    const opportunities = oppIds.length > 0 ? await prisma.opportunity.findMany({
      where: {
        id: { in: oppIds }
      },
      select: {
        id: true,
        opportunityNumber: true,
        title: true
      }
    }) : [];

    const leadIdToOpp: Record<string, { id: string; opportunityNumber: string | null; title: string }> = {};
    opportunities.forEach(opp => {
      const leadId = oppIdToLeadId[opp.id];
      if (leadId) {
        leadIdToOpp[leadId] = opp;
      }
    });

    const formattedLeads = leads.map(lead => ({
      ...lead,
      owner: lead.User,
      opportunity: leadIdToOpp[lead.id] || null,
    }));

    return {
      success: true,
      leads: formattedLeads,
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
        Category: { select: { id: true, name: true } },
        Opportunity: {
          select: {
            id: true,
            opportunityNumber: true,
            title: true
          }
        }
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
  email?: string;
  phone: string;
  alternativePhone?: string;
  company?: string;
  source?: string;
  website?: string;
  facebook?: string;
  ownerId?: string;
  notes?: string;
  categoryId?: string;
  reference?: string;
  photo?: string;
  startingDate?: Date;
  location?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "create"))) {
      return { success: false, error: "Permission Denied: crm.leads.create" };
    }

    // Validate phone presence (Required field)
    if (!input.phone) {
      return { success: false, error: "Phone number is required" };
    }

    const leadNumber = await generateLeadNumber();

    // Dynamically assign fallback email if missing/empty to satisfy unique constraint
    const hasEmail = input.email && input.email.trim() !== "";
    
    // Extract last 4 digits of leadNumber
    const leadNumberParts = leadNumber.split("-");
    const fourDigits = leadNumberParts[leadNumberParts.length - 1] || "0000";
    
    const sanitizedEmail = hasEmail 
      ? input.email!.trim() 
      : `${fourDigits}XXXX@email.com`;

    const isPlaceholder = sanitizedEmail.endsWith("XXXX@email.com");
    const checkEmail = hasEmail && !isPlaceholder;

    // Check for duplicates (only for real, non-placeholder emails)
    const where: Prisma.LeadWhereInput = { OR: [] };
    if (checkEmail) where.OR?.push({ email: sanitizedEmail });
    if (input.phone) where.OR?.push({ phone: input.phone });

    if (where.OR && where.OR.length > 0) {
      const existingLead = await prisma.lead.findFirst({ where });
      if (existingLead) {
        if (checkEmail && existingLead.email === sanitizedEmail) {
          return { success: false, error: "A lead with this email already exists." };
        }
        if (input.phone && existingLead.phone === input.phone) {
          return { success: false, error: "A lead with this phone number already exists." };
        }
      }
    }

    // Destructure to separate lead data from extra info like notes
    const { notes, ownerId: providedOwnerId, ...leadData } = input;
    const ownerId = providedOwnerId || session.user.id;

    // Sanitize data
    const sanitizedData: any = {
      ...leadData,
      email: sanitizedEmail,
      alternativePhone: leadData.alternativePhone || null,
      website: leadData.website || null,
      facebook: leadData.facebook || null,
      categoryId: leadData.categoryId || null,
      reference: leadData.reference || null,
      photo: leadData.photo || null,
      startingDate: leadData.startingDate || new Date(),
      location: leadData.location || null,
    };

    const lead = await prisma.lead.create({
      data: {
        ...sanitizedData,
        leadNumber,
        ownerId,
      },
    });

    await logItemCreated(session.user.id, "Lead", lead.id, lead.name, lead);
    
    // Emit System Event for Timeline (handles activity ledger recording)
    const { emitSystemEvent } = await import("@/lib/system/hooks");
    await emitSystemEvent({
      entityType: "lead",
      entityId: lead.id,
      eventType: "LEAD_CREATED",
      actorId: session.user.id,
      description: `Lead created: ${lead.name}`,
    });

    // If extra notes are provided, log them as a separate event
    if (notes) {
        await emitSystemEvent({
            entityType: "lead",
            entityId: lead.id,
            eventType: "NOTE_CREATED", // Or a specific INITIAL_NOTE if we had one
            actorId: session.user.id,
            description: `Initial Lead Note: ${notes}`,
            metadata: { content: notes }
        });
    }

    // Create system notification
    await createNotification({
      title: "New Lead Created",
      message: `New lead "${lead.name}" has been created.`,
      type: NotificationType.INFO,
      userId: ownerId, // Notify the lead owner
      createdBy: session.user.id,
      entityType: "lead",
      entityId: lead.id,
    });
    
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
      include: { User: { select: { name: true } } }
    });

    await logItemUpdated(session.user.id, "Lead", leadId, ["ownerId"], lead.name, { ownerId });

    // Log to Timeline using emitSystemEvent
    const { emitSystemEvent } = await import("@/lib/system/hooks");
    await emitSystemEvent({
      entityType: "lead",
      entityId: leadId,
      eventType: "LEAD_UPDATED",
      actorId: session.user.id,
      description: `Lead ownership assigned to ${lead.User.name || "Unknown User"}.`,
      metadata: { 
        changes: [{
          field: "ownerId",
          from: lead.ownerId, // This might be stale if we didn't fetch old lead owner, but usually it's acceptable or we can fetch old one. actually assignLeadOwner doesn't fetch old lead first.
          to: ownerId
        }]
      }
    });
    revalidateBothPaths("crm/leads");

    return { success: true, lead };
  } catch (error) {
    console.error("assignLeadOwner error:", error);
    return { success: false, error: "Failed to assign lead owner" };
  }
}

/**
 * Update lead information
 */
export async function updateLead(leadId: string, input: {
  name?: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  company?: string;
  source?: string;
  website?: string;
  facebook?: string;
  categoryId?: string;
  reference?: string;
  photo?: string;
  startingDate?: Date;
  closingReason?: string;
  location?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "edit"))) {
      return { success: false, error: "Permission Denied: crm.leads.edit" };
    }

    const oldLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!oldLead) return { success: false, error: "Lead not found" };

    // Dynamically assign fallback email if missing/empty to satisfy unique constraint
    const hasEmail = input.email && input.email.trim() !== "";
    
    // Extract last 4 digits of oldLead.leadNumber
    const leadNumberParts = (oldLead.leadNumber || "").split("-");
    const fourDigits = leadNumberParts[leadNumberParts.length - 1] || "0000";

    const sanitizedEmail = hasEmail 
      ? input.email!.trim() 
      : `${fourDigits}XXXX@email.com`;

    const isPlaceholder = sanitizedEmail.endsWith("XXXX@email.com");
    const checkEmail = hasEmail && !isPlaceholder;

    // Check for duplicates (excluding current lead, only for real, non-placeholder emails)
    const where: Prisma.LeadWhereInput = { 
      OR: [],
      NOT: { id: leadId }
    };
    if (checkEmail) where.OR?.push({ email: sanitizedEmail });
    if (input.phone) where.OR?.push({ phone: input.phone });

    if (where.OR && where.OR.length > 0) {
      const existingLead = await prisma.lead.findFirst({ where });
      if (existingLead) {
        if (checkEmail && existingLead.email === sanitizedEmail) {
          return { success: false, error: "A lead with this email already exists." };
        }
        if (input.phone && existingLead.phone === input.phone) {
          return { success: false, error: "A lead with this phone number already exists." };
        }
      }
    }

    // Sanitize data
    const sanitizedInput: any = {
      ...input,
      email: sanitizedEmail,
      alternativePhone: input.alternativePhone === "" ? null : input.alternativePhone,
      website: input.website === "" ? null : input.website,
      facebook: input.facebook === "" ? null : input.facebook,
      categoryId: input.categoryId === "" ? null : input.categoryId,
      reference: input.reference === "" ? null : input.reference,
      photo: input.photo === "" ? null : input.photo,
      startingDate: input.startingDate || undefined,
      closingReason: input.closingReason === "" ? null : input.closingReason,
      location: input.location === "" ? null : input.location,
    };

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: sanitizedInput,
    });

    // Track changes for activity log
    const changes: string[] = [];
    const structuredChanges: any[] = [];

    if (input.name && input.name !== oldLead.name) {
      changes.push(`Name: ${oldLead.name} -> ${input.name}`);
      structuredChanges.push({ field: "name", from: oldLead.name, to: input.name });
    }
    if (input.email && input.email !== oldLead.email) {
      changes.push(`Email: ${oldLead.email} -> ${input.email}`);
      structuredChanges.push({ field: "email", from: oldLead.email, to: input.email });
    }
    if (input.phone && input.phone !== oldLead.phone) {
      changes.push(`Phone: ${oldLead.phone || "None"} -> ${input.phone}`);
      structuredChanges.push({ field: "phone", from: oldLead.phone, to: input.phone });
    }
    if (input.company && input.company !== oldLead.company) {
      changes.push(`Company: ${oldLead.company || "None"} -> ${input.company}`);
      structuredChanges.push({ field: "company", from: oldLead.company, to: input.company });
    }
    if (input.source && input.source !== oldLead.source) {
      changes.push(`Source: ${oldLead.source || "None"} -> ${input.source}`);
      structuredChanges.push({ field: "source", from: oldLead.source, to: input.source });
    }
    if (input.categoryId !== undefined && input.categoryId !== oldLead.categoryId) {
      changes.push(`Category: ${oldLead.categoryId || "None"} -> ${input.categoryId}`);
      structuredChanges.push({ field: "categoryId", from: oldLead.categoryId, to: input.categoryId });
    }
    if (input.reference !== undefined && input.reference !== oldLead.reference) {
      changes.push(`Reference: ${oldLead.reference || "None"} -> ${input.reference}`);
      structuredChanges.push({ field: "reference", from: oldLead.reference, to: input.reference });
    }
    if (input.location !== undefined && input.location !== oldLead.location) {
      changes.push(`Location: ${oldLead.location || "None"} -> ${input.location}`);
      structuredChanges.push({ field: "location", from: oldLead.location, to: input.location });
    }
    if (input.photo !== undefined && input.photo !== oldLead.photo) {
      changes.push(`Photo: ${oldLead.photo || "None"} -> ${input.photo}`);
      structuredChanges.push({ field: "photo", from: oldLead.photo, to: input.photo });
    }

    if (changes.length > 0) {
      const { emitSystemEvent } = await import("@/lib/system/hooks");
      await emitSystemEvent({
        entityType: "lead",
        entityId: leadId,
        eventType: "LEAD_UPDATED",
        actorId: session.user.id,
        description: `Lead details updated`,
        metadata: { changes: structuredChanges }
      });

      await logItemUpdated(session.user.id, "Lead", leadId, Object.keys(input), lead.name, input);
      
      // Create system notification
      await createNotification({
        title: "Lead Updated",
        message: `Lead "${lead.name}" has been updated.`,
        type: NotificationType.INFO,
        userId: lead.ownerId, // Notify the lead owner
        createdBy: session.user.id,
        entityType: "lead",
        entityId: leadId,
      });
    }

    revalidateBothPaths("crm/leads");
    return { success: true, lead };
  } catch (error) {
    console.error("updateLead error:", error);
    return { success: false, error: "Failed to update lead" };
  }
}

/**
 * Update lead status
 * Rule: status must use enum
 */
export async function updateLeadStatus(leadId: string, status: LeadStatus, closingReason?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "edit"))) {
      return { success: false, error: "Permission Denied: crm.leads.edit" };
    }

    if (status === "UNQUALIFIED" && (!closingReason || !closingReason.trim())) {
      return { success: false, error: "Closing reason is required when marking a lead as unqualified" };
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { 
        status,
        closingReason: status === "UNQUALIFIED" ? closingReason : null,
      },
    });

    await logItemUpdated(session.user.id, "Lead", leadId, ["status"], lead.name, { status });

    // Log to Timeline using emitSystemEvent
    const { emitSystemEvent } = await import("@/lib/system/hooks");
    await emitSystemEvent({
      entityType: "lead",
      entityId: leadId,
      eventType: "LEAD_STATUS_CHANGED",
      actorId: session.user.id,
      description: `Lead status changed to ${status}.${closingReason ? ` Reason: ${closingReason}` : ""}`,
      metadata: { 
        changes: [{
          field: "status",
          from: lead.status === status ? "Unknown" : "Old Status",
          to: status
        }],
        closingReason: closingReason || undefined,
       }
    });
    
    // Create system notification
    await createNotification({
      title: "Lead Status Updated",
      message: `Lead "${lead.name}" status changed to ${status}.`,
      type: NotificationType.INFO,
      userId: lead.ownerId, // Notify the lead owner
      createdBy: session.user.id,
      entityType: "lead",
      entityId: leadId,
    });
      
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

    const { createActivityRecord } = await import("@/lib/system/activity-ledger");
    const activity = await createActivityRecord({
      type: input.type as any,
      subject: input.subject,
      description: input.description,
      dueDate: input.dueDate,
      contextType: "lead",
      contextId: leadId,
      actorId: session.user.id,
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
      const clientEmail = lead.email || `no+${(lead.leadNumber || lead.id).toLowerCase()}@email.com`;

      let client = await tx.client.findFirst({
        where: { email: clientEmail }
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
            email: clientEmail,
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
          email: clientEmail,
          phone: lead.phone,
          clientId: client.id,
          isPrimary: true,
          role: "Decision Maker",
        }
      });

      // 3. Create Opportunity linked to Client
      // Generate Opportunity Number
      const { generateOpportunityCode } = await import("./opportunity.action");
      let opportunityNumber = await generateOpportunityCode(tx);
      
      // Ensure code doesn't exist
      let codeExists = await tx.opportunity.findUnique({
        where: { opportunityNumber },
        select: { id: true }
      });

      // Retry logic
      let attempts = 0;
      while (codeExists && attempts < 5) {
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

      const opportunity = await tx.opportunity.create({
        data: {
          title: input.opportunityTitle,
          value: input.opportunityValue,
          expectedCloseDate: input.expectedCloseDate,
          clientId: client.id,
          contactId: contact.id,
          stage: OpportunityStage.DISCOVERY,
          ownerId: session.user.id,
          opportunityNumber,
          leadId,
        }
      });

      // 4. Mark Lead as Converted
      await tx.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.CONVERTED }
      });

      return { opportunityId: opportunity.id, contactId: contact.id };
    });
    
    // Log activity for the new opportunity (outside transaction to avoid circular logic if activity creation fails, though ideally it should be robust)
    const { createActivity } = await import("./activity.action"); // Assuming createActivity is in activity.action
    await createActivity({
        type: "created",
        subject: "Opportunity created from Lead",
        description: `Converted from Lead: ${lead.name}`,
        opportunityId: result.opportunityId,
        contactId: result.contactId,
        leadId: leadId
    });

    console.log(`Transaction committed, Opportunity ID: ${result.opportunityId}`);
    await logItemUpdated(session.user.id, "Lead", leadId, ["status"], lead.name, { status: LeadStatus.CONVERTED });
    
    // Create system notification
    await createNotification({
      title: "Lead Converted",
      message: `Lead "${lead.name}" has been converted to an opportunity.`,
      type: NotificationType.SUCCESS,
      userId: lead.ownerId, // Notify the lead owner
      createdBy: session.user.id,
      entityType: "opportunity",
      entityId: result.opportunityId,
    });

    // Emit System Event for conversion
    const { emitSystemEvent } = await import("@/lib/system/hooks");
    await emitSystemEvent({
      entityType: "lead",
      entityId: leadId,
      eventType: "LEAD_CONVERTED",
      actorId: session.user.id,
      description: `Converted to Opportunity: ${input.opportunityTitle}`,
      metadata: {
        opportunityId: result.opportunityId,
        contactId: result.contactId,
        leadId: leadId
      }
    });

    // Also emit for the new opportunity
    await emitSystemEvent({
        entityType: "opportunity",
        entityId: result.opportunityId,
        eventType: "OPPORTUNITY_CREATED",
        actorId: session.user.id,
        description: `Created from Lead: ${lead.name}`,
        metadata: {
          leadId: leadId,
          contactId: result.contactId
        }
      });

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

/**
 * One-time utility to backfill lead numbers for existing leads
 */
export async function backfillLeadNumbers() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.leads", "create"))) {
      return { success: false, error: "Permission Denied" };
    }

    const leadsToBackfill = await prisma.lead.findMany({
      where: { leadNumber: null },
      orderBy: { createdAt: "asc" }
    });

    console.log(`Backfilling ${leadsToBackfill.length} leads...`);

    for (const lead of leadsToBackfill) {
      const leadNumber = await generateLeadNumber();
      await prisma.lead.update({
        where: { id: lead.id },
        data: { leadNumber }
      });
    }

    return { success: true, count: leadsToBackfill.length };
  } catch (error) {
    console.error("backfillLeadNumbers error:", error);
    return { success: false, error: "Failed to backfill lead numbers" };
  }
}

/**
 * Bulk move leads to trash
 */
export async function bulkMoveToTrash(leadIds: string[]) {
  try {
    const session = await auth();
    console.log("bulkMoveToTrash session:", session?.user?.id);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    // Check for "move-to-trash" permission
    const hasPermission = await checkPermission(session.user.id, "crm.leads", "move-to-trash");
    console.log("bulkMoveToTrash permission:", hasPermission);
    
    if (!hasPermission) {
      return { success: false, error: "Permission Denied: crm.leads.move-to-trash" };
    }

    const { count } = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        isTrash: false,
      },
      data: {
        isTrash: true,
        deletedAt: new Date(),
      },
    });
    console.log("bulkMoveToTrash moved count:", count);

    revalidateBothPaths("crm/leads");
    return { success: true, count };
  } catch (error) {
    console.error("bulkMoveToTrash error:", error);
    return { success: false, error: "Failed to move leads to trash" };
  }
}

/**
 * Bulk restore leads from trash
 */
export async function bulkRestore(leadIds: string[]) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    // Restore requires move-to-trash or delete-permanently permission (logic: if you can trash, you can untrash)
    // Or stricter: only if you can delete permanently? Let's use move-to-trash for now as it's the inverse.
    if (!(await checkPermission(session.user.id, "crm.leads", "move-to-trash"))) {
      return { success: false, error: "Permission Denied: crm.leads.move-to-trash" };
    }

    const { count } = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        isTrash: true,
      },
      data: {
        isTrash: false,
        deletedAt: null,
      },
    });

    revalidateBothPaths("crm/leads");
    return { success: true, count };
  } catch (error) {
    console.error("bulkRestore error:", error);
    return { success: false, error: "Failed to restore leads" };
  }
}

/**
 * Bulk permanently delete leads
 * Constraint: Cannot delete converted leads
 */
export async function bulkDeletePermanently(leadIds: string[]) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    // Check for "delete-permanently"
    if (!(await checkPermission(session.user.id, "crm.leads", "delete-permanently"))) {
      return { success: false, error: "Permission Denied: crm.leads.delete-permanently" };
    }

    // Check for converted leads
    const convertedLeads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        status: LeadStatus.CONVERTED,
      },
      select: { id: true, name: true },
    });

    if (convertedLeads.length > 0) {
      return { 
        success: false, 
        error: `Cannot delete converted leads: ${convertedLeads.map(l => l.name).join(", ")}` 
      };
    }
    
    // Proceed with delete
    const { count } = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds },
        isTrash: true, // Only delete from trash? Or allow direct delete? Usually from trash.
      },
    });

    revalidateBothPaths("crm/leads");
    return { success: true, count };
  } catch (error) {
    console.error("bulkDeletePermanently error:", error);
    return { success: false, error: "Failed to delete leads permanently" };
  }
}

/**
 * Get all active categories
 */
export async function getActiveCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
    return { success: true, categories };
  } catch (error) {
    console.error("getActiveCategories error:", error);
    return { success: false, error: "Failed to fetch categories", categories: [] };
  }
}

/**
 * Get all unique lead sources
 */
export async function getLeadSources() {
  try {
    const leads = await prisma.lead.findMany({
      where: { source: { not: null, not: "" } },
      select: { source: true },
      distinct: ["source"],
      orderBy: { source: "asc" },
    });
    const dbSources = leads.map(l => l.source as string);
    const standardSources = [
      "Website",
      "Referral",
      "Cold Call",
      "LinkedIn",
      "Facebook",
      "X",
      "Instagram",
      "Partner",
      "Email Campaign",
      "Event",
    ];
    const uniqueSources = Array.from(new Set([...standardSources, ...dbSources])).sort();
    return { success: true, sources: uniqueSources };
  } catch (error) {
    console.error("getLeadSources error:", error);
    return { success: false, error: "Failed to fetch lead sources", sources: [] };
  }
}
