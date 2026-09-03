"use server";

import {
  SupportTicketType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketSource,
  SupportCommentType,
  SupportCoverageStatus,
  SupportSLAStatus
} from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  generateTicketNumber,
  evaluateTicketCoverage,
  calculateSLADeadline,
  evaluateSupportTicketSLA,
  getHolidaysForOrganization
} from "@/lib/support/sla-engine";

export async function createSupportTicketAction(data: {
  organizationId: string;
  clientId: string;
  contactId?: string;
  projectId?: string;
  title: string;
  description: string;
  type?: SupportTicketType;
  priority?: SupportTicketPriority;
  source?: SupportTicketSource;
  createdById: string;
}) {
  try {
    const { organizationId, clientId, contactId, projectId, title, description, createdById } = data;
    const type = data.type || SupportTicketType.INCIDENT;
    const priority = data.priority || SupportTicketPriority.MEDIUM;
    const source = data.source || SupportTicketSource.INTERNAL;

    // 1. Verify Client & Tenant Boundary
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId }
    });
    if (!client) {
      return { success: false, error: `Client ${clientId} not found or tenant boundary violated.` };
    }

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, clientId, organizationId }
      });
      if (!contact) {
        return { success: false, error: `Contact ${contactId} does not belong to Client ${clientId}.` };
      }
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId }
      });
      if (!project) {
        return { success: false, error: `Project ${projectId} not found or tenant boundary violated.` };
      }
    }

    // 2. Server-derived Entitlement & Coverage Evaluation
    const { coverageStatus, entitlementId } = await evaluateTicketCoverage(clientId, projectId, organizationId);

    const now = new Date();

    // 3. Transactional Snapshotting & Creation (Prevents Race 10 partial snapshots)
    const result = await prisma.$transaction(async (tx) => {
      // Find active SLA policy inside transaction
      let slaPolicy = await tx.supportSLAPolicy.findFirst({
        where: { organizationId, priority, active: true }
      });

      if (!slaPolicy) {
        slaPolicy = await tx.supportSLAPolicy.findFirst({
          where: { organizationId, active: true }
        });
      }

      const firstResponseMins = slaPolicy?.firstResponseMinutes || 60;
      const resolutionMins = slaPolicy?.resolutionMinutes || 1440;
      const businessHoursOnly = slaPolicy?.businessHoursOnly ?? true;
      const timezone = slaPolicy?.timezone || "UTC";
      const workingDaysStr = slaPolicy?.workingDays || "1,2,3,4,5";
      const workingDays = workingDaysStr.split(",").map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
      const startHour = slaPolicy?.businessStartHour ?? 9;
      const endHour = slaPolicy?.businessEndHour ?? 17;
      const observeHolidays = slaPolicy?.observeHolidays ?? true;

      const holidays = observeHolidays ? await getHolidaysForOrganization(organizationId, tx) : [];

      const calendarConfig = {
        businessHoursOnly,
        timezone,
        workingDays,
        businessStartHour: startHour,
        businessEndHour: endHour,
        observeHolidays,
        holidays
      };

      const firstResponseDueAt = calculateSLADeadline(now, firstResponseMins, calendarConfig);
      const resolutionDueAt = calculateSLADeadline(now, resolutionMins, calendarConfig);

      const ticketNumber = await generateTicketNumber(organizationId, tx);

      const ticket = await tx.supportTicket.create({
        data: {
          organizationId,
          ticketNumber,
          clientId,
          contactId,
          projectId,
          entitlementId,
          title,
          description,
          type,
          priority,
          reportedPriority: priority,
          effectivePriority: priority,
          status: SupportTicketStatus.OPEN,
          source,
          coverageStatus,
          slaPolicyId: slaPolicy?.id,
          createdById
        }
      });

      const sla = await tx.supportTicketSLA.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          policyId: slaPolicy?.id,
          firstResponseMinutesSnapshot: firstResponseMins,
          resolutionMinutesSnapshot: resolutionMins,
          businessHoursOnlySnapshot: businessHoursOnly,
          timezoneSnapshot: timezone,
          workingDaysSnapshot: workingDaysStr,
          businessStartHourSnapshot: startHour,
          businessEndHourSnapshot: endHour,
          observeHolidaysSnapshot: observeHolidays,
          startedAt: now,
          firstResponseDueAt,
          resolutionDueAt,
          status: SupportSLAStatus.RUNNING,
          firstResponseStatus: SupportSLAStatus.RUNNING,
          resolutionStatus: SupportSLAStatus.RUNNING
        }
      });

      await tx.supportTicketAuditLog.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          actorUserId: createdById,
          action: "TICKET_CREATED",
          details: { ticketNumber, type, priority, coverageStatus }
        }
      });

      return { ticket, sla };
    });

    return { success: true, data: result.ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addSupportTicketCommentAction(data: {
  organizationId: string;
  ticketId: string;
  authorUserId: string;
  type?: SupportCommentType;
  content: string;
}) {
  try {
    const { organizationId, ticketId, authorUserId, content } = data;
    const type = data.type || SupportCommentType.PUBLIC_REPLY;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, organizationId },
      include: { SupportTicketSLA: true }
    });

    if (!ticket) {
      return { success: false, error: "Support ticket not found or tenant boundary violated." };
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.supportTicketComment.create({
        data: {
          organizationId,
          ticketId,
          authorUserId,
          type,
          content
        }
      });

      // Race 2: Atomic first response update for public replies if not already set
      if (type === SupportCommentType.PUBLIC_REPLY) {
        const updateRes = await tx.supportTicket.updateMany({
          where: { id: ticketId, firstResponseAt: null },
          data: { firstResponseAt: now }
        });

        // Exactly one worker succeeds in setting firstResponseAt
        if (updateRes.count === 1 && ticket.SupportTicketSLA) {
          const isBreached = now > ticket.SupportTicketSLA.firstResponseDueAt;
          const status = isBreached ? SupportSLAStatus.FIRST_RESPONSE_BREACHED : SupportSLAStatus.FIRST_RESPONSE_MET;

          await tx.supportTicketSLA.update({
            where: { ticketId },
            data: {
              firstRespondedAt: now,
              firstResponseStatus: status
            }
          });

          await tx.supportTicketAuditLog.create({
            data: {
              organizationId,
              ticketId,
              actorUserId: authorUserId,
              action: "FIRST_RESPONSE_RECORDED",
              details: { firstRespondedAt: now.toISOString(), status }
            }
          });
        }
      }

      await tx.supportTicketAuditLog.create({
        data: {
          organizationId,
          ticketId,
          actorUserId: authorUserId,
          action: type === SupportCommentType.PUBLIC_REPLY ? "PUBLIC_REPLY_ADDED" : "INTERNAL_NOTE_ADDED",
          details: { commentId: comment.id }
        }
      });

      return comment;
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSupportTicketStatusAction(data: {
  organizationId: string;
  ticketId: string;
  newStatus: SupportTicketStatus;
  actorUserId: string;
}) {
  try {
    const { organizationId, ticketId, newStatus, actorUserId } = data;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Authoritative row-level lock to prevent stale precondition reads in concurrent races
      await tx.$executeRaw`SELECT id FROM "SupportTicket" WHERE id = ${ticketId} FOR UPDATE`;

      const ticket = await tx.supportTicket.findFirst({
        where: { id: ticketId, organizationId },
        include: { SupportTicketSLA: { include: { SupportSLAPauses: true } } }
      });

      if (!ticket) {
        throw new Error("Support ticket not found or tenant boundary violated.");
      }

      const prevStatus = ticket.status;

      // Authoritative CLOSE precondition check
      if (newStatus === SupportTicketStatus.CLOSED) {
        if (prevStatus !== SupportTicketStatus.RESOLVED || !ticket.resolvedAt) {
          throw new Error("Cannot close ticket: current resolution authority does not exist or ticket is not in RESOLVED status.");
        }
      }

      if (newStatus === prevStatus) {
        return { success: true, data: ticket, unchanged: true };
      }

      const updateData: any = { status: newStatus, updatedAt: now };

      if (newStatus === SupportTicketStatus.RESOLVED) {
        updateData.resolvedAt = ticket.resolvedAt || now;

        // Persist resolution history (Requirements 11 & 12)
        const cycleNumber = ticket.reopenCount + 1;
        const existingHistory = await tx.supportTicketResolutionHistory.findFirst({
          where: { ticketId, cycleNumber }
        });
        if (!existingHistory) {
          await tx.supportTicketResolutionHistory.create({
            data: {
              organizationId,
              ticketId,
              cycleNumber,
              resolvedAt: updateData.resolvedAt,
              resolvedById: actorUserId
            }
          });
        }
      } else if (newStatus === SupportTicketStatus.CLOSED) {
        updateData.closedAt = ticket.closedAt || now;
      } else if (newStatus === SupportTicketStatus.CANCELLED) {
        updateData.cancelledAt = ticket.cancelledAt || now;
      }

      await tx.supportTicket.update({
        where: { id: ticketId },
        data: updateData
      });

      // Handle SLA Pause vs Resume logic
      const isPauseState = newStatus === SupportTicketStatus.WAITING_CLIENT || newStatus === SupportTicketStatus.WAITING_THIRD_PARTY;
      const wasPauseState = prevStatus === SupportTicketStatus.WAITING_CLIENT || prevStatus === SupportTicketStatus.WAITING_THIRD_PARTY;

      if (ticket.SupportTicketSLA) {
        const slaId = ticket.SupportTicketSLA.id;

        if (isPauseState && !wasPauseState) {
          // Pause SLA (Ensure active pauses <= 1)
          const existingActive = await tx.supportSLAPause.findFirst({
            where: { ticketSlaId: slaId, endedAt: null }
          });

          if (!existingActive) {
            await tx.supportSLAPause.create({
              data: {
                organizationId,
                ticketSlaId: slaId,
                reason: `Status changed to ${newStatus}`,
                startedAt: now
              }
            });

            await tx.supportTicketSLA.update({
              where: { id: slaId },
              data: { pausedAt: now, status: SupportSLAStatus.PAUSED }
            });
          }
        } else if (!isPauseState && wasPauseState && ticket.SupportTicketSLA.pausedAt) {
          // Resume SLA & calculate pause duration
          const activePause = await tx.supportSLAPause.findFirst({
            where: { ticketSlaId: slaId, endedAt: null },
            orderBy: { createdAt: "desc" }
          });

          let addedMins = 0;
          if (activePause) {
            addedMins = Math.max(0, Math.floor((now.getTime() - activePause.startedAt.getTime()) / (1000 * 60)));
            await tx.supportSLAPause.update({
              where: { id: activePause.id },
              data: { endedAt: now, durationMinutes: addedMins }
            });
          }

          await tx.supportTicketSLA.update({
            where: { id: slaId },
            data: {
              pausedAt: null,
              totalPausedMinutes: { increment: addedMins },
              status: SupportSLAStatus.RUNNING
            }
          });
        }

        if (newStatus === SupportTicketStatus.RESOLVED) {
          await tx.supportTicketSLA.update({
            where: { id: slaId },
            data: {
              resolvedAt: updateData.resolvedAt,
              resolutionStatus: (updateData.resolvedAt <= ticket.SupportTicketSLA.resolutionDueAt)
                ? SupportSLAStatus.RESOLUTION_MET
                : SupportSLAStatus.RESOLUTION_BREACHED
            }
          });
        } else if (newStatus === SupportTicketStatus.CLOSED || newStatus === SupportTicketStatus.CANCELLED) {
          await tx.supportTicketSLA.update({
            where: { id: slaId },
            data: {
              status: SupportSLAStatus.COMPLETED
            }
          });
        }
      }

      await tx.supportTicketAuditLog.create({
        data: {
          organizationId,
          ticketId,
          actorUserId,
          action: "STATUS_CHANGED",
          details: { from: prevStatus, to: newStatus }
        }
      });

      return { success: true, prevStatus, newStatus };
    });

    if (result.success && !(result as any).unchanged) {
      await evaluateSupportTicketSLA(ticketId, organizationId);
    }
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignSupportTicketAction(data: {
  organizationId: string;
  ticketId: string;
  assignedUserId?: string;
  assignedEmployeeId?: string;
  assignedDepartmentId?: string;
  actorUserId: string;
}) {
  try {
    const { organizationId, ticketId, assignedUserId, assignedEmployeeId, assignedDepartmentId, actorUserId } = data;

    // Race 5: Transactional assignment serialization
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "SupportTicket" WHERE id = ${ticketId} FOR UPDATE`;

      const ticket = await tx.supportTicket.findFirst({
        where: { id: ticketId, organizationId }
      });

      if (!ticket) {
        throw new Error("Support ticket not found or tenant boundary violated.");
      }

      const res = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedUserId,
          assignedEmployeeId,
          assignedDepartmentId,
          status: ticket.status === SupportTicketStatus.OPEN ? SupportTicketStatus.ASSIGNED : ticket.status
        }
      });

      await tx.supportTicketAuditLog.create({
        data: {
          organizationId,
          ticketId,
          actorUserId,
          action: "TICKET_ASSIGNED",
          details: { assignedUserId, assignedEmployeeId, assignedDepartmentId }
        }
      });

      return res;
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reopenSupportTicketAction(data: {
  organizationId: string;
  ticketId: string;
  actorUserId: string;
  reason?: string;
}) {
  try {
    const { organizationId, ticketId, actorUserId, reason } = data;

    // Requirements 11 & 12: Preserves resolution history and resets active resolution state
    const updated = await prisma.$transaction(async (tx) => {
      // Authoritative row-level lock to prevent stale precondition reads in concurrent races
      await tx.$executeRaw`SELECT id FROM "SupportTicket" WHERE id = ${ticketId} FOR UPDATE`;

      const ticket = await tx.supportTicket.findFirst({
        where: { id: ticketId, organizationId },
        include: { SupportTicketSLA: true }
      });

      if (!ticket) {
        throw new Error("Support ticket not found or tenant boundary violated.");
      }

      // Authoritative REOPEN precondition check
      if (ticket.status !== SupportTicketStatus.RESOLVED && ticket.status !== SupportTicketStatus.CLOSED) {
        throw new Error(`Cannot reopen ticket: ticket is in status ${ticket.status}, not RESOLVED or CLOSED.`);
      }

      if (ticket.status === SupportTicketStatus.RESOLVED && !ticket.resolvedAt) {
        throw new Error("Cannot reopen ticket: resolution authority does not exist.");
      }

      // If ticket is currently resolved but doesn't have a resolution history record yet, create one
      if (ticket.resolvedAt) {
        const cycleNumber = ticket.reopenCount + 1;
        const existingHistory = await tx.supportTicketResolutionHistory.findFirst({
          where: { ticketId, cycleNumber }
        });
        if (!existingHistory) {
          await tx.supportTicketResolutionHistory.create({
            data: {
              organizationId,
              ticketId,
              cycleNumber,
              resolvedAt: ticket.resolvedAt,
              resolvedById: actorUserId
            }
          });
        }
      }

      const res = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: SupportTicketStatus.IN_PROGRESS,
          resolvedAt: null,
          closedAt: null,
          reopenCount: { increment: 1 }
        }
      });

      // Clear resolution state on SLA instance if present, leaving firstResponseAt untouched
      if (ticket.SupportTicketSLA) {
        await tx.supportTicketSLA.update({
          where: { ticketId },
          data: {
            resolvedAt: null,
            resolutionStatus: SupportSLAStatus.RUNNING,
            status: SupportSLAStatus.RUNNING
          }
        });
      }

      await tx.supportTicketAuditLog.create({
        data: {
          organizationId,
          ticketId,
          actorUserId,
          action: "TICKET_REOPENED",
          details: { reason: reason || "Client or agent requested reopening", reopenCount: res.reopenCount }
        }
      });

      return res;
    });

    await evaluateSupportTicketSLA(ticketId, organizationId);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function overrideSupportTicketCoverageAction(data: {
  organizationId: string;
  ticketId: string;
  newCoverageStatus: SupportCoverageStatus;
  actorUserId: string;
  reason: string;
}) {
  try {
    const { organizationId, ticketId, newCoverageStatus, actorUserId, reason } = data;

    if (!reason || reason.trim() === "") {
      return { success: false, error: "Explicit reason is required for coverage override." };
    }

    // Race 8: Transactional override serialization with full audit
    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id: ticketId, organizationId }
      });

      if (!ticket) {
        throw new Error("Support ticket not found or tenant boundary violated.");
      }

      const prevCoverage = ticket.coverageStatus;

      const res = await tx.supportTicket.update({
        where: { id: ticketId },
        data: { coverageStatus: newCoverageStatus }
      });

      await tx.supportTicketAuditLog.create({
        data: {
          organizationId,
          ticketId,
          actorUserId,
          action: "COVERAGE_OVERRIDDEN",
          details: { from: prevCoverage, to: newCoverageStatus, reason }
        }
      });

      return res;
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function linkTicketToIssueAction(data: {
  organizationId: string;
  ticketId: string;
  issueId: string;
  actorUserId: string;
}) {
  const { organizationId, ticketId, issueId, actorUserId } = data;
  try {
    const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, organizationId } });
    const issue = await prisma.issue.findFirst({ where: { id: issueId, organizationId } });

    if (!ticket || !issue) {
      return { success: false, error: "Ticket or Issue not found or tenant boundary violated." };
    }

    // Race 9: DB-backed uniqueness via @unique([ticketId, issueId])
    const link = await prisma.supportTicketIssueLink.create({
      data: {
        organizationId,
        ticketId,
        issueId,
        createdById: actorUserId
      }
    });

    await prisma.supportTicketAuditLog.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        action: "ISSUE_LINKED",
        details: { issueId }
      }
    });

    return { success: true, data: link };
  } catch (error: any) {
    // Return gracefully if duplicate link attempted
    if (error.code === "P2002" || error.message?.includes("Unique constraint")) {
      const existing = await prisma.supportTicketIssueLink.findUnique({
        where: { ticketId_issueId: { ticketId, issueId } }
      });
      return { success: true, data: existing };
    }
    return { success: false, error: error.message };
  }
}

export async function linkTicketToTaskAction(data: {
  organizationId: string;
  ticketId: string;
  taskId: string;
  actorUserId: string;
}) {
  const { organizationId, ticketId, taskId, actorUserId } = data;
  try {
    const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, organizationId } });
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });

    if (!ticket || !task) {
      return { success: false, error: "Ticket or Task not found or tenant boundary violated." };
    }

    const link = await prisma.supportTicketTaskLink.create({
      data: {
        organizationId,
        ticketId,
        taskId,
        createdById: actorUserId
      }
    });

    await prisma.supportTicketAuditLog.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        action: "TASK_LINKED",
        details: { taskId }
      }
    });

    return { success: true, data: link };
  } catch (error: any) {
    if (error.code === "P2002" || error.message?.includes("Unique constraint")) {
      const existing = await prisma.supportTicketTaskLink.findUnique({
        where: { ticketId_taskId: { ticketId, taskId } }
      });
      return { success: true, data: existing };
    }
    return { success: false, error: error.message };
  }
}
