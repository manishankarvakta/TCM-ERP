/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClientPortalContext, verifyPortalPermission, verifyClientAccess, PortalContext } from "@/lib/portal-context";
import { findControlAccount } from "./accounting-helpers";
import { VoucherType } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ==========================================
// 1. SCHEMAS & UTILITIES
// ==========================================

const inviteSchema = z.object({
  clientId: z.string().min(1),
  email: z.string().email(),
});

const registerPortalSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

const commentSchema = z.object({
  ticketId: z.string().min(1),
  content: z.string().min(1),
});

const ticketSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  type: z.enum(["BUG", "INCIDENT", "SERVICE_REQUEST", "QUESTION", "ACCESS_REQUEST", "MAINTENANCE", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

const changeRequestSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(5),
  idempotencyKey: z.string().optional(),
});

const profileSchema = z.object({
  name: z.string().min(2),
  password: z.string().min(8).optional(),
});

async function getTenantTimezone(organizationId: string): Promise<string> {
  const orgSetting = await prisma.settings.findFirst({
    where: {
      organization_id: organizationId,
      code: "experience",
    },
  });
  if (orgSetting && typeof orgSetting.settings === "object" && orgSetting.settings !== null) {
    const s = orgSetting.settings as Record<string, any>;
    if (s.timezone) {
      return s.timezone;
    }
  }
  return "Asia/Dhaka";
}

// Helper to audit events
async function logPortalEvent(
  organizationId: string,
  userId: string,
  action: string,
  details: any
) {
  try {
    await prisma.userLog.create({
      data: {
        userId,
        action: `PORTAL_${action}`,
        details: JSON.stringify(details),
      },
    });
  } catch (error) {
    console.error("Portal logging failed:", error);
  }
}

// ==========================================
// 2. PORTAL INVITATION / ACTIVATION ACTIONS
// ==========================================

/**
 * Creates an invitation for a client contact to access the client portal.
 * Accessible only by authenticated internal users.
 */
export async function createPortalInvitation(data: { clientId: string; email: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "UNAUTHORIZED: Session required" };
    }

    const validated = inviteSchema.parse(data);

    // Fetch client to confirm existence and resolve organizationId
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
      select: { organizationId: true },
    });

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const { organizationId } = client;

    // Revoke any existing PENDING invitations for this email under this client
    await prisma.portalInvitation.updateMany({
      where: {
        organizationId,
        clientId: validated.clientId,
        email: validated.email,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    // Generate secure random token and hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

    await prisma.portalInvitation.create({
      data: {
        organizationId,
        clientId: validated.clientId,
        email: validated.email,
        tokenHash,
        expiresAt,
        status: "PENDING",
      },
    });

    await logPortalEvent(organizationId, session.user.id, "INVITATION_CREATED", {
      clientId: validated.clientId,
      email: validated.email,
    });

    return {
      success: true,
      token: rawToken, // Return raw token to caller (intended for email link)
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create invitation" };
  }
}

/**
 * Gets invitation info from a raw token.
 */
export async function getPortalInvitation(token: string) {
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await prisma.portalInvitation.findUnique({
      where: { tokenHash },
      include: {
        Client: { select: { name: true, company: true } },
        Organization: { select: { name: true } },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invalid invitation link" };
    }

    if (invitation.status !== "PENDING") {
      return { success: false, error: "Invitation has already been used or revoked" };
    }

    if (invitation.expiresAt < new Date()) {
      return { success: false, error: "Invitation link has expired" };
    }

    return {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        clientName: invitation.Client.name,
        companyName: invitation.Client.company,
        orgName: invitation.Organization.name,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to retrieve invitation" };
  }
}

/**
 * Accepts a portal invitation, registers a new credential User, and provisions a PortalUser profile.
 * Implements strict repeatable-read database transaction safety to prevent duplicate activation races.
 */
export async function acceptInvitationAndRegister(data: z.infer<typeof registerPortalSchema>) {
  try {
    const validated = registerPortalSchema.parse(data);
    const tokenHash = crypto.createHash("sha256").update(validated.token).digest("hex");

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch & lock the invitation
        const invite = await tx.portalInvitation.findUnique({
          where: { tokenHash },
        });

        if (!invite) {
          throw new Error("INVALID_TOKEN");
        }

        if (invite.status !== "PENDING") {
          throw new Error("ALREADY_CONSUMED_OR_REVOKED");
        }

        if (invite.expiresAt < new Date()) {
          throw new Error("EXPIRED_TOKEN");
        }

        // 2. Check if user already exists
        let user = await tx.user.findUnique({
          where: { email: invite.email },
        });

        if (user) {
          // Check if already has a PortalUser record
          const existingPortalUser = await tx.portalUser.findUnique({
            where: { userId: user.id },
          });
          if (existingPortalUser) {
            throw new Error("DUPLICATE_MEMBERSION_ERROR");
          }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password, 12);

        // 3. Create User if they don't exist, otherwise update password/role
        if (!user) {
          user = await tx.user.create({
            data: {
              email: invite.email,
              name: validated.name,
              password: hashedPassword,
              role: "client",
              status: "active",
              organizationId: invite.organizationId,
            },
          });
        } else {
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              name: validated.name,
              password: hashedPassword,
              role: "client",
              status: "active",
              organizationId: invite.organizationId,
            },
          });
        }

        // 4. Create PortalUser
        const portalUser = await tx.portalUser.create({
          data: {
            userId: user.id,
            clientId: invite.clientId,
            organizationId: invite.organizationId,
            status: "active",
            permissions: [
              "portal.dashboard.view",
              "portal.projects.view",
              "portal.deliverables.view",
              "portal.files.view",
              "portal.files.upload",
              "portal.invoices.view",
              "portal.payments.view",
              "portal.support.view",
              "portal.support.create",
              "portal.support.comment",
              "portal.change-requests.view",
              "portal.change-requests.create",
              "portal.approvals.view",
              "portal.approvals.respond",
              "portal.profile.manage",
            ],
          },
        });

        // 5. Consume invitation
        await tx.portalInvitation.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED" },
        });

        // 6. Create audit log
        await tx.userLog.create({
          data: {
            userId: user.id,
            action: "PORTAL_INVITATION_ACCEPTED",
            details: JSON.stringify({ invitationId: invite.id, portalUserId: portalUser.id }),
          },
        });

        return { userId: user.id, portalUserId: portalUser.id };
      },
      {
        isolationLevel: "RepeatableRead",
      }
    );

    return { success: true, ...result };
  } catch (error: any) {
    return {
      success: false,
      error:
        error.message === "INVALID_TOKEN"
          ? "Invalid token"
          : error.message === "ALREADY_CONSUMED_OR_REVOKED"
          ? "Invitation has already been accepted or revoked"
          : error.message === "EXPIRED_TOKEN"
          ? "Invitation has expired"
          : error.message === "DUPLICATE_MEMBERSION_ERROR"
          ? "Account already active"
          : error.message || "Failed to accept invitation",
    };
  }
}

// ==========================================
// 3. DASHBOARD RECONCILIATION & DATA MINIMIZATION
// ==========================================

export async function getPortalDashboard() {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.dashboard.view");

    const timezone = await getTenantTimezone(ctx.organizationId);

    // Active Projects Count
    const activeProjectsCount = await prisma.project.count({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        status: { in: ["PLANNING", "IN_PROGRESS", "REVIEW", "DELIVERY"] as any },
      },
    });

    // Invoices and Accounts Receivable
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: ctx.organizationId,
        Order: { clientId: ctx.clientId },
        status: "posted",
      },
      select: {
        id: true,
        totalAmount: true,
        Voucher_Voucher_invoiceIdToInvoice: {
          include: { VoucherLine: true },
        },
      },
    });

    const arAccountId = await findControlAccount("Accounts Receivable");

    let outstandingInvoicesCount = 0;
    let outstandingTotal = 0;
    let paidTotal = 0;

    invoices.forEach((inv) => {
      const initialAR = Number(inv.totalAmount);
      let appliedAmount = 0;

      if (arAccountId) {
        inv.Voucher_Voucher_invoiceIdToInvoice.forEach((v) => {
          v.VoucherLine.forEach((line) => {
            if (line.chartOfAccountId === arAccountId) {
              appliedAmount += Number(line.creditAmount);
            }
          });
        });
      }

      const outstanding = initialAR - appliedAmount;
      paidTotal += appliedAmount;

      if (outstanding > 0.01) {
        outstandingInvoicesCount++;
        outstandingTotal += outstanding;
      }
    });

    // Open Tickets Count
    const openTicketsCount = await prisma.supportTicket.count({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });

    // SLA Breach Count
    const openSlaBreachCount = await prisma.supportTicket.count({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
        SupportTicketSLA: {
          status: { in: ["FIRST_RESPONSE_BREACHED", "RESOLUTION_BREACHED"] as any },
        },
      },
    });

    // Pending Client Actions (Feedback/Acceptance requests)
    const pendingActionsCount = await prisma.clientAcceptance.count({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        status: "PENDING",
      },
    });

    // Visible Change Requests Count
    const changeRequestsCount = await prisma.changeRequest.count({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        // In client view, only show analyzed/proposed CRs or client-facing CRs
      },
    });

    // Shared Files Count
    const sharedFilesCount = await prisma.portalFileShare.count({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        visibleToPortal: true,
      },
    });

    return {
      success: true,
      data: {
        activeProjectsCount,
        outstandingInvoicesCount,
        outstandingTotal,
        paidTotal,
        openTicketsCount,
        openSlaBreachCount,
        pendingActionsCount,
        changeRequestsCount,
        sharedFilesCount,
        timezone,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to retrieve dashboard" };
  }
}

// ==========================================
// 4. PROJECT & DELIVERABLE VISIBILITY
// ==========================================

export async function getPortalProjects() {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.projects.view");

    // Fetch projects with data minimization (explicit SELECT fields only!)
    const projects = await prisma.project.findMany({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
      },
      select: {
        id: true,
        projectNumber: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        endDate: true,
        health: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPortalProjectDetails(projectId: string) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.projects.view");

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
      },
      select: {
        id: true,
        projectNumber: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        endDate: true,
        health: true,
        readyForClientReviewAt: true,
        // Only fetch client-visible milestones and tasks
        Milestones: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueDate: true,
          },
          orderBy: { dueDate: "asc" },
        },
        Tasks: {
          where: {
            // Exclude internal execution tasks if they don't have a milestone, or enforce milestone linking
            milestoneId: { not: null },
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueDate: true,
          },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!project) {
      return { success: false, error: "Project not found or access denied" };
    }

    return { success: true, project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 5. INVOICES & PAYMENTS RECONCILIATION
// ==========================================

export async function getPortalInvoices() {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.invoices.view");

    // Fetch invoices with details needed for AR calculation
    const rawInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: ctx.organizationId,
        Order: { clientId: ctx.clientId },
        status: "posted",
      },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        totalAmount: true,
        status: true,
        Voucher_Voucher_invoiceIdToInvoice: {
          select: { VoucherLine: true },
        },
      },
      orderBy: { date: "desc" },
    });

    const arAccountId = await findControlAccount("Accounts Receivable");

    const invoices = rawInvoices.map((inv) => {
      const initialAR = Number(inv.totalAmount);
      let appliedAmount = 0;

      if (arAccountId) {
        inv.Voucher_Voucher_invoiceIdToInvoice.forEach((v) => {
          v.VoucherLine.forEach((line) => {
            if (line.chartOfAccountId === arAccountId) {
              appliedAmount += Number(line.creditAmount);
            }
          });
        });
      }

      const outstanding = initialAR - appliedAmount;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        dueDate: inv.date,
        totalAmount: initialAR,
        paidAmount: appliedAmount,
        outstandingAmount: outstanding,
        status: inv.status,
      };
    });

    return { success: true, invoices };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPortalPayments() {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.payments.view");

    // Retrieve Payments associated with client orders or direct receipts
    const receipts = await prisma.voucher.findMany({
      where: {
        organizationId: ctx.organizationId,
        type: VoucherType.RECEIPT,
        status: "posted",
        // Linked to the client via VoucherLine or metadata
        VoucherLine: {
          some: {
            clientId: ctx.clientId,
          },
        },
      },
      select: {
        id: true,
        voucherNumber: true,
        date: true,
        reference: true,
        description: true,
        VoucherLine: {
          select: {
            id: true,
            clientId: true,
            debitAmount: true,
            creditAmount: true,
            chartOfAccountId: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const arAccountId = await findControlAccount("Accounts Receivable");
    const advanceAccountId = await findControlAccount("Customer Advance");

    const payments = receipts.map((rcpt) => {
      let amount = 0;

      rcpt.VoucherLine.forEach((line) => {
        if (line.clientId === ctx.clientId) {
          // Sum the credit to either AR or Advances, which represents the cash receipt value
          if (
            (arAccountId && line.chartOfAccountId === arAccountId) ||
            (advanceAccountId && line.chartOfAccountId === advanceAccountId)
          ) {
            amount += Number(line.creditAmount);
          }
        }
      });

      return {
        id: rcpt.id,
        paymentNumber: rcpt.voucherNumber,
        date: rcpt.date,
        reference: rcpt.reference,
        description: rcpt.description,
        amount,
      };
    });

    return { success: true, payments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Pay Now trigger - Unavailable
export async function initiateOnlinePayment(invoiceId: string) {
  return {
    success: false,
    error: "Online payment gateway integration is currently unavailable.",
  };
}

// ==========================================
// 6. SUPPORT INTEGRATION (PHASE 18 CAPABILITIES)
// ==========================================

export async function getPortalTickets() {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.support.view");

    const tickets = await prisma.supportTicket.findMany({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        SupportTicketSLA: {
          select: {
            status: true,
            firstResponseDueAt: true,
            resolutionDueAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, tickets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPortalTicketDetails(ticketId: string) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.support.view");

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        coverageStatus: true,
        // Exclude all comments of type INTERNAL_NOTE on query level!
        SupportTicketComments: {
          where: {
            type: "PUBLIC_REPLY",
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            authorUserId: true,
            authorContactId: true,
          },
          orderBy: { createdAt: "asc" },
        },
        SupportTicketSLA: {
          select: {
            id: true,
            status: true,
            firstResponseDueAt: true,
            resolutionDueAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found or access denied" };
    }

    return { success: true, ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPortalTicket(data: z.infer<typeof ticketSchema>) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.support.create");

    const validated = ticketSchema.parse(data);

    // Resolve a ticket number sequence or generate one
    const ticketCount = await prisma.supportTicket.count({
      where: { organizationId: ctx.organizationId },
    });
    const ticketNumber = `TKT-${1000 + ticketCount + 1}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        ticketNumber,
        title: validated.title,
        description: validated.description,
        type: validated.type,
        priority: validated.priority,
        status: "OPEN",
        source: "CLIENT_PORTAL",
        createdById: ctx.userId,
      },
    });

    await logPortalEvent(ctx.organizationId, ctx.userId, "TICKET_CREATED", {
      ticketId: ticket.id,
      ticketNumber,
    });

    return { success: true, ticketId: ticket.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPortalTicketComment(data: z.infer<typeof commentSchema>) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.support.comment");

    const validated = commentSchema.parse(data);

    // Verify ticket ownership
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: validated.ticketId,
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
      },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found or access denied" };
    }

    const comment = await prisma.supportTicketComment.create({
      data: {
        organizationId: ctx.organizationId,
        ticketId: validated.ticketId,
        authorUserId: ctx.userId,
        type: "PUBLIC_REPLY", // Explicitly default to public reply
        content: validated.content,
      },
    });

    await logPortalEvent(ctx.organizationId, ctx.userId, "TICKET_COMMENT_ADDED", {
      ticketId: ticket.id,
      commentId: comment.id,
    });

    return { success: true, commentId: comment.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 7. CHANGE REQUEST PORTAL INTEGRATION
// ==========================================

export async function getPortalChangeRequests() {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.change-requests.view");

    const rawChangeRequests = await prisma.changeRequest.findMany({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
      },
      select: {
        id: true,
        changeRequestNumber: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        commercialImpactAmount: true,
        timelineImpactDays: true,
        approvalRequestId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const changeRequests = rawChangeRequests.map((cr) => ({
      id: cr.id,
      changeRequestNumber: cr.changeRequestNumber,
      title: cr.title,
      description: cr.description,
      status: cr.status,
      requestedDate: cr.createdAt,
      proposedCost: Number(cr.commercialImpactAmount),
      proposedHours: cr.timelineImpactDays * 8,
      approvalRequestId: cr.approvalRequestId,
    }));

    return { success: true, changeRequests };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const crLocks = new Set<string>();

async function acquireCRLock(key: string): Promise<void> {
  while (crLocks.has(key)) {
    await new Promise((r) => setTimeout(r, 10));
  }
  crLocks.add(key);
}

function releaseCRLock(key: string) {
  crLocks.delete(key);
}

export async function createPortalChangeRequest(data: z.infer<typeof changeRequestSchema>) {
  const validated = changeRequestSchema.parse(data);
  const lockKey = `${validated.projectId}:${validated.title}:${validated.description}`;
  await acquireCRLock(lockKey);

  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.change-requests.create");

    // Verify project belongs to client
    const project = await prisma.project.findFirst({
      where: {
        id: validated.projectId,
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
      },
    });

    if (!project) {
      releaseCRLock(lockKey);
      return { success: false, error: "Project not found or access denied" };
    }

    // Compute request payload hash
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ projectId: validated.projectId, title: validated.title, description: validated.description }))
      .digest("hex");

    try {
      // 1. Durable DB Idempotency Key check
      if (validated.idempotencyKey) {
        const existing = await prisma.changeRequest.findFirst({
          where: { idempotencyKey: validated.idempotencyKey },
        });

        if (existing) {
          if (existing.idempotencyPayloadHash === payloadHash) {
            return { success: true, changeRequestId: existing.id, isDuplicate: true };
          } else {
            return { success: false, error: "IDEMPOTENCY_CONFLICT: Key already used with a different payload" };
          }
        }
      } else {
        // Idempotency check: prevent duplicate storm within 5s window
        const recentCR = await prisma.changeRequest.findFirst({
          where: {
            organizationId: ctx.organizationId,
            projectId: validated.projectId,
            title: validated.title,
            description: validated.description,
            createdAt: {
              gt: new Date(Date.now() - 5000),
            },
          },
        });

        if (recentCR) {
          return { success: true, changeRequestId: recentCR.id, isDuplicate: true };
        }
      }

      const crCount = await prisma.changeRequest.count({
        where: { organizationId: ctx.organizationId },
      });
      const crNumber = `CR-${1000 + crCount + 1}`;

      try {
        const changeRequest = await prisma.changeRequest.create({
          data: {
            organizationId: ctx.organizationId,
            clientId: ctx.clientId,
            projectId: validated.projectId,
            changeRequestNumber: crNumber,
            title: validated.title,
            description: validated.description,
            status: "SUBMITTED",
            createdById: ctx.userId,
            idempotencyKey: validated.idempotencyKey || null,
            idempotencyPayloadHash: payloadHash,
          },
        });

        await logPortalEvent(ctx.organizationId, ctx.userId, "CR_SUBMITTED", {
          changeRequestId: changeRequest.id,
          changeRequestNumber: crNumber,
        });

        return { success: true, changeRequestId: changeRequest.id };
      } catch (dbError: any) {
        // Handle concurrent insert unique constraint error
        if (dbError.code === "P2002" && validated.idempotencyKey) {
          const concurrentCR = await prisma.changeRequest.findFirst({
            where: { idempotencyKey: validated.idempotencyKey },
          });
          if (concurrentCR) {
            if (concurrentCR.idempotencyPayloadHash === payloadHash) {
              return { success: true, changeRequestId: concurrentCR.id, isDuplicate: true };
            } else {
              return { success: false, error: "IDEMPOTENCY_CONFLICT: Key already used with a different payload" };
            }
          }
        }
        throw dbError;
      }
    } finally {
      releaseCRLock(lockKey);
    }
  } catch (error: any) {
    releaseCRLock(lockKey);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 8. CLIENT ACCEPTANCE / APPROVAL ACTIONS
// ==========================================

export async function respondToClientAcceptance(data: {
  acceptanceId: string;
  status: "APPROVED" | "REJECTED";
  feedback?: string;
  ipAddress?: string;
}) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.approvals.respond");

    const acceptance = await prisma.clientAcceptance.findUnique({
      where: { id: data.acceptanceId },
    });

    if (!acceptance || acceptance.clientId !== ctx.clientId) {
      return { success: false, error: "Acceptance request not found or access denied" };
    }

    if (acceptance.status !== "PENDING") {
      return { success: false, error: "This request has already been resolved" };
    }

    const updated = await prisma.clientAcceptance.update({
      where: { id: data.acceptanceId },
      data: {
        status: data.status,
        feedback: data.feedback,
        ipAddress: data.ipAddress,
        portalUserId: ctx.portalUserId,
      },
    });

    // Depending on what is accepted, trigger state updates (without modifying canonical accounting rules)
    if (acceptance.artifactType === "CHANGE_REQUEST" && data.status === "APPROVED") {
      // Logic for Change Request client signature
      await prisma.changeRequest.update({
        where: { id: acceptance.artifactId },
        data: { status: "APPROVED" },
      });
    }

    await logPortalEvent(ctx.organizationId, ctx.userId, "ACCEPTANCE_RESPONDED", {
      acceptanceId: acceptance.id,
      status: data.status,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 9. FILES / SECURE FILE SHARE ACTIONS
// ==========================================

export async function getPortalFiles() {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.files.view");

    // Fetch shared files through the link table (visibleToPortal = true)
    const fileShares = await prisma.portalFileShare.findMany({
      where: {
        organizationId: ctx.organizationId,
        clientId: ctx.clientId,
        visibleToPortal: true,
      },
      include: {
        File: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
      },
      orderBy: { sharedAt: "desc" },
    });

    const files = fileShares.map((share) => ({
      shareId: share.id,
      fileId: share.File.id,
      name: share.File.name,
      mimeType: share.File.mimeType,
      size: share.File.size,
      sharedAt: share.sharedAt,
    }));

    return { success: true, files };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function downloadPortalFile(shareId: string) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.files.view");

    const share = await prisma.portalFileShare.findUnique({
      where: { id: shareId },
      include: { File: true },
    });

    if (!share || share.clientId !== ctx.clientId || !share.visibleToPortal) {
      return { success: false, error: "File not shared or access denied" };
    }

    // Return client-safe details and signed path mock (do not leak direct storage creds)
    return {
      success: true,
      file: {
        name: share.File.name,
        mimeType: share.File.mimeType,
        size: share.File.size,
        downloadUrl: `/api/portal/files/download?id=${share.id}`,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadPortalFile(data: {
  name: string;
  size: number;
  mimeType: string;
  contentBase64: string; // Base64 simulated upload content
}) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.files.upload");

    // File security validation
    if (data.size > 10 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 10MB limit" };
    }

    const allowedMimeTypes = ["image/png", "image/jpeg", "application/pdf", "application/zip"];
    if (!allowedMimeTypes.includes(data.mimeType)) {
      return { success: false, error: "Unsupported file type" };
    }

    const storageKey = `portal/${ctx.clientId}/${crypto.randomUUID()}-${data.name}`;

    // Create the file record safely (isolation layer)
    const file = await prisma.file.create({
      data: {
        organizationId: ctx.organizationId,
        ownerId: ctx.userId,
        name: data.name,
        path: `/storage/${storageKey}`,
        storageKey,
        size: data.size,
        mimeType: data.mimeType,
      },
    });

    // Create FileShare link
    await prisma.portalFileShare.create({
      data: {
        organizationId: ctx.organizationId,
        fileId: file.id,
        clientId: ctx.clientId,
        visibleToPortal: true,
        sharedById: ctx.userId,
      },
    });

    await logPortalEvent(ctx.organizationId, ctx.userId, "FILE_UPLOADED", {
      fileId: file.id,
      name: data.name,
    });

    return { success: true, fileId: file.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 10. NOTIFICATIONS
// ==========================================

export async function getPortalNotifications() {
  try {
    const ctx = await getClientPortalContext();

    const notifications = await prisma.notification.findMany({
      where: {
        userId: ctx.userId,
      },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, notifications };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markPortalNotificationRead(notificationId: string) {
  try {
    const ctx = await getClientPortalContext();

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: ctx.userId,
      },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 11. PROFILE MANAGEMENT
// ==========================================

export async function updatePortalProfile(data: z.infer<typeof profileSchema>) {
  try {
    const ctx = await getClientPortalContext();
    verifyPortalPermission(ctx, "portal.profile.manage");

    const validated = profileSchema.parse(data);

    const updateData: any = {
      name: validated.name,
    };

    if (validated.password) {
      updateData.password = await bcrypt.hash(validated.password, 12);
    }

    await prisma.user.update({
      where: { id: ctx.userId },
      data: updateData,
    });

    await logPortalEvent(ctx.organizationId, ctx.userId, "PROFILE_UPDATED", {
      userId: ctx.userId,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
