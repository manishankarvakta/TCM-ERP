// Phase 18A — Support Ticketing & SLA Engine Core
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportSLAStatus,
  SupportCoverageStatus,
  SupportEntitlementStatus
} from "@prisma/client";
import prisma from "../prisma";

export interface SLACalendarConfig {
  businessHoursOnly?: boolean;
  timezone?: string; // e.g. "Asia/Dhaka", "America/New_York", "UTC"
  workingDays?: number[]; // e.g. [0, 1, 2, 3, 4] for Sun-Thu, [1, 2, 3, 4, 5] for Mon-Fri
  businessStartHour?: number; // e.g. 9
  businessEndHour?: number; // e.g. 17 or 18
  observeHolidays?: boolean;
  holidays?: string[]; // Array of "YYYY-MM-DD" local date strings
}

export interface SLACalculationResult {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  firstResponseStatus: SupportSLAStatus;
  resolutionStatus: SupportSLAStatus;
  overallSLAStatus: SupportSLAStatus;
  isFirstResponseBreached: boolean;
  isResolutionBreached: boolean;
}

/**
 * Extract zoned date parts (year, month, day, hour, minute, second, dayOfWeek, localDateStr)
 * for a Date object in a specific IANA timezone.
 */
export function getZonedParts(date: Date, timeZone: string = "UTC") {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10) - 1; // 0-indexed
    const day = parseInt(map.day, 10);
    const hour = parseInt(map.hour === "24" ? "0" : map.hour, 10);
    const minute = parseInt(map.minute, 10);
    const second = parseInt(map.second, 10);

    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const localDateStr = `${year}-${monthStr}-${dayStr}`;

    // Calculate local day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay();

    return { year, month, day, hour, minute, second, dayOfWeek, localDateStr };
  } catch (e) {
    // Fallback to UTC if invalid timezone provided
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const dayOfWeek = date.getUTCDay();
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const localDateStr = `${year}-${monthStr}-${dayStr}`;

    return { year, month, day, hour, minute, second, dayOfWeek, localDateStr };
  }
}

/**
 * Constructs a Date object given local year, month (0-indexed), day, hour, minute in a target IANA timezone.
 */
export function makeZonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = "UTC"
): Date {
  const utcMs = Date.UTC(year, month, day, hour, minute, 0, 0);
  const testDate = new Date(utcMs);
  const zoned = getZonedParts(testDate, timeZone);

  const diffMs = Date.UTC(year, month, day, hour, minute) - Date.UTC(zoned.year, zoned.month, zoned.day, zoned.hour, zoned.minute);
  return new Date(utcMs + diffMs);
}

/**
 * Calculates target SLA deadline Date, respecting tenant timezone, working days, daily opening/closing times, and holidays.
 */
export function calculateSLADeadline(
  startedAt: Date,
  minutesToAdd: number,
  config: boolean | SLACalendarConfig = true
): Date {
  const options: SLACalendarConfig = typeof config === "boolean" ? { businessHoursOnly: config } : config;
  const businessHoursOnly = options.businessHoursOnly ?? true;

  if (!businessHoursOnly || minutesToAdd <= 0) {
    return new Date(startedAt.getTime() + minutesToAdd * 60 * 1000);
  }

  const timeZone = options.timezone || "UTC";
  const workingDays = options.workingDays || [1, 2, 3, 4, 5]; // Default Mon-Fri
  const startHour = options.businessStartHour ?? 9;
  const endHour = options.businessEndHour ?? 17;
  const observeHolidays = options.observeHolidays ?? true;
  const holidaySet = new Set(options.holidays || []);

  let curr = new Date(startedAt.getTime());
  let remainingMinutes = minutesToAdd;

  // Maximum safety iterations (prevent infinite loops)
  let maxGuard = 10000;

  while (remainingMinutes > 0 && maxGuard-- > 0) {
    const zoned = getZonedParts(curr, timeZone);
    const isWorkingDay = workingDays.includes(zoned.dayOfWeek);
    const isHoliday = observeHolidays && holidaySet.has(zoned.localDateStr);

    if (!isWorkingDay || isHoliday) {
      // Advance to start hour of next day
      curr = makeZonedDate(zoned.year, zoned.month, zoned.day + 1, startHour, 0, timeZone);
      continue;
    }

    if (zoned.hour < startHour) {
      // Advance to start hour of current day
      curr = makeZonedDate(zoned.year, zoned.month, zoned.day, startHour, 0, timeZone);
      continue;
    }

    if (zoned.hour >= endHour) {
      // Advance to start hour of next day
      curr = makeZonedDate(zoned.year, zoned.month, zoned.day + 1, startHour, 0, timeZone);
      continue;
    }

    // Currently inside open business window
    const minsLeftInWindow = (endHour - zoned.hour) * 60 - zoned.minute;

    if (remainingMinutes <= minsLeftInWindow) {
      curr = new Date(curr.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= minsLeftInWindow;
      // Advance to start hour of next day
      curr = makeZonedDate(zoned.year, zoned.month, zoned.day + 1, startHour, 0, timeZone);
    }
  }

  return curr;
}

/**
 * Fetches tenant holidays as "YYYY-MM-DD" local date strings.
 */
export async function getHolidaysForOrganization(
  organizationId: string,
  client?: any
): Promise<string[]> {
  const db = client || prisma;
  const holidays = await db.holiday.findMany({
    where: {
      organizationId,
      status: "active",
      isTrash: false
    },
    select: { date: true }
  });
  return holidays.map((h: any) => h.date.toISOString().split("T")[0]);
}

/**
 * Generates deterministic, sequence-safe ticket numbers (SUP-YYYY-XXXXXX).
 */
export async function generateTicketNumber(
  organizationId: string,
  client?: any
): Promise<string> {
  const db = client || prisma;
  const year = new Date().getFullYear();

  const seq = await db.supportTicketSequence.upsert({
    where: {
      organizationId_year: { organizationId, year }
    },
    update: {
      lastSequence: { increment: 1 }
    },
    create: {
      organizationId,
      year,
      lastSequence: 1
    }
  });

  const paddedNum = String(seq.lastSequence).padStart(6, "0");
  return `SUP-${year}-${paddedNum}`;
}

/**
 * Evaluates ticket coverage against active persisted SupportEntitlements.
 */
export async function evaluateTicketCoverage(
  clientId: string,
  projectId?: string | null,
  organizationId?: string,
  client?: any
): Promise<{ coverageStatus: SupportCoverageStatus; entitlementId: string | null }> {
  const db = client || prisma;
  const now = new Date();

  const entitlement = await db.supportEntitlement.findFirst({
    where: {
      clientId,
      ...(organizationId ? { organizationId } : {}),
      ...(projectId ? { projectId } : {}),
      status: SupportEntitlementStatus.ACTIVE,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: { createdAt: "desc" }
  });

  if (entitlement) {
    return { coverageStatus: SupportCoverageStatus.COVERED, entitlementId: entitlement.id };
  }

  const fallbackEntitlement = await db.supportEntitlement.findFirst({
    where: {
      clientId,
      ...(organizationId ? { organizationId } : {}),
      status: SupportEntitlementStatus.ACTIVE,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: { createdAt: "desc" }
  });

  if (fallbackEntitlement) {
    return { coverageStatus: SupportCoverageStatus.COVERED, entitlementId: fallbackEntitlement.id };
  }

  return { coverageStatus: SupportCoverageStatus.NOT_COVERED, entitlementId: null };
}

/**
 * Evaluates ticket SLA state, enforcing exact-deadline semantics:
 * actual <= dueAt -> MET
 * actual > dueAt -> BREACHED
 */
export async function evaluateSupportTicketSLA(
  ticketId: string,
  organizationId: string,
  client?: any
): Promise<SLACalculationResult> {
  const db = client || prisma;

  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      SupportTicketSLA: true
    }
  });

  if (!ticket || !ticket.SupportTicketSLA) {
    throw new Error(`SupportTicket ${ticketId} or SLA record not found.`);
  }

  const sla = ticket.SupportTicketSLA;
  const now = new Date();

  let firstResponseStatus = sla.firstResponseStatus;
  let resolutionStatus = sla.resolutionStatus;
  let overallSLAStatus = sla.status;

  // 1. Evaluate First Response SLA
  if (sla.firstRespondedAt) {
    if (sla.firstRespondedAt <= sla.firstResponseDueAt) {
      firstResponseStatus = SupportSLAStatus.FIRST_RESPONSE_MET;
    } else {
      firstResponseStatus = SupportSLAStatus.FIRST_RESPONSE_BREACHED;
    }
  } else if (ticket.status === SupportTicketStatus.WAITING_CLIENT || ticket.status === SupportTicketStatus.WAITING_THIRD_PARTY) {
    firstResponseStatus = SupportSLAStatus.PAUSED;
  } else if (now > sla.firstResponseDueAt) {
    firstResponseStatus = SupportSLAStatus.FIRST_RESPONSE_BREACHED;
  } else {
    firstResponseStatus = SupportSLAStatus.RUNNING;
  }

  // 2. Evaluate Resolution SLA
  if (sla.resolvedAt) {
    if (sla.resolvedAt <= sla.resolutionDueAt) {
      resolutionStatus = SupportSLAStatus.RESOLUTION_MET;
    } else {
      resolutionStatus = SupportSLAStatus.RESOLUTION_BREACHED;
    }
  } else if (ticket.status === SupportTicketStatus.WAITING_CLIENT || ticket.status === SupportTicketStatus.WAITING_THIRD_PARTY) {
    resolutionStatus = SupportSLAStatus.PAUSED;
  } else if (now > sla.resolutionDueAt) {
    resolutionStatus = SupportSLAStatus.RESOLUTION_BREACHED;
  } else {
    resolutionStatus = SupportSLAStatus.RUNNING;
  }

  // 3. Evaluate Overall Status
  if (ticket.status === SupportTicketStatus.CLOSED || ticket.status === SupportTicketStatus.RESOLVED) {
    overallSLAStatus = (resolutionStatus === SupportSLAStatus.RESOLUTION_BREACHED || firstResponseStatus === SupportSLAStatus.FIRST_RESPONSE_BREACHED)
      ? SupportSLAStatus.RESOLUTION_BREACHED
      : SupportSLAStatus.COMPLETED;
  } else if (ticket.status === SupportTicketStatus.CANCELLED) {
    overallSLAStatus = SupportSLAStatus.CANCELLED;
  } else if (firstResponseStatus === SupportSLAStatus.PAUSED || resolutionStatus === SupportSLAStatus.PAUSED) {
    overallSLAStatus = SupportSLAStatus.PAUSED;
  } else if (firstResponseStatus === SupportSLAStatus.FIRST_RESPONSE_BREACHED || resolutionStatus === SupportSLAStatus.RESOLUTION_BREACHED) {
    overallSLAStatus = SupportSLAStatus.RESOLUTION_BREACHED;
  } else {
    overallSLAStatus = SupportSLAStatus.RUNNING;
  }

  // Update DB state
  await db.supportTicketSLA.update({
    where: { id: sla.id },
    data: {
      firstResponseStatus,
      resolutionStatus,
      status: overallSLAStatus
    }
  });

  return {
    firstResponseDueAt: sla.firstResponseDueAt,
    resolutionDueAt: sla.resolutionDueAt,
    firstResponseStatus,
    resolutionStatus,
    overallSLAStatus,
    isFirstResponseBreached: firstResponseStatus === SupportSLAStatus.FIRST_RESPONSE_BREACHED,
    isResolutionBreached: resolutionStatus === SupportSLAStatus.RESOLUTION_BREACHED
  };
}
