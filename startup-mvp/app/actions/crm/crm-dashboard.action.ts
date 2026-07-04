"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeData } from "@/lib/utils/serialization";
import { OpportunityStage } from "@prisma/client";
import { checkPermission } from "@/lib/permissions";

/**
 * Get aggregated metrics for the Admin CRM Dashboard
 */
export async function getAdminCrmMetrics() {
  try {
    const session = await auth();
    if (!session?.user) return serializeData({ success: false, error: "Unauthorized" });

    if (!(await checkPermission(session.user.id, "crm", "view"))) {
      return serializeData({ success: false, error: "Permission Denied: crm.view" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate dates for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      totalOpportunities,
      totalLeads,
      wonOpportunities,
      lostOpportunities,
      openOpportunities,
      recentLeads,
      leadsBySource,
      recentWonOpportunities
    ] = await Promise.all([
      // Total Pipeline Value (Open)
      prisma.opportunity.aggregate({
        where: { stage: { notIn: [OpportunityStage.WON, OpportunityStage.LOST] } },
        _sum: { value: true },
        _count: true
      }),
      
      // New Leads this month
      prisma.lead.count({
        where: { createdAt: { gte: startOfMonth }, isTrash: false }
      }),

      // Won Opportunities Value
      prisma.opportunity.aggregate({
        where: { stage: OpportunityStage.WON },
        _sum: { value: true },
        _count: true
      }),

      // Lost Opportunities Value
      prisma.opportunity.aggregate({
        where: { stage: OpportunityStage.LOST },
        _sum: { value: true },
        _count: true
      }),

      // Opportunities grouped by stage for Funnel
      prisma.opportunity.groupBy({
        by: ['stage'],
        _count: { id: true },
        _sum: { value: true },
      }),

      // 5 Most recent leads
      prisma.lead.findMany({
        where: { isTrash: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, company: true, status: true, createdAt: true }
      }),

      // Leads grouped by source
      prisma.lead.groupBy({
        by: ['source'],
        _count: { id: true },
        where: { isTrash: false }
      }),

      // Recent won opportunities for timeline (last 6 months)
      prisma.opportunity.findMany({
        where: { 
          stage: OpportunityStage.WON,
          createdAt: { gte: sixMonthsAgo } 
        },
        select: { value: true, createdAt: true }
      })
    ]);

    const stageCounts = {
      DISCOVERY: 0,
      QUALIFIED: 0,
      SOLUTION: 0,
      PROPOSAL: 0,
      NEGOTIATION: 0,
      WON: 0,
      LOST: 0
    };

    openOpportunities.forEach(opp => {
      if (stageCounts[opp.stage] !== undefined) {
        stageCounts[opp.stage as keyof typeof stageCounts] = opp._count.id;
      }
    });

    // Build Monthly Revenue Chart Data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueByMonth = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now);
      d.setMonth(now.getMonth() - (5 - i));
      return {
        name: `${monthNames[d.getMonth()]}`,
        month: d.getMonth(),
        year: d.getFullYear(),
        revenue: 0,
        deals: 0
      };
    });

    recentWonOpportunities.forEach(opp => {
      const oppDate = new Date(opp.createdAt);
      const oppMonth = oppDate.getMonth();
      const oppYear = oppDate.getFullYear();
      
      const targetMonth = revenueByMonth.find(m => m.month === oppMonth && m.year === oppYear);
      if (targetMonth) {
        targetMonth.revenue += Number(opp.value || 0);
        targetMonth.deals += 1;
      }
    });

    // Build Lead Source Data
    const leadSources = leadsBySource.map(source => ({
      name: source.source || 'Unknown',
      value: source._count.id
    })).sort((a, b) => b.value - a.value);

    const metrics = {
      pipelineValue: totalOpportunities._sum.value || 0,
      pipelineCount: totalOpportunities._count || 0,
      wonValue: wonOpportunities._sum.value || 0,
      wonCount: wonOpportunities._count || 0,
      lostValue: lostOpportunities._sum.value || 0,
      lostCount: lostOpportunities._count || 0,
      newLeadsMonth: totalLeads,
      funnel: stageCounts,
      recentLeads,
      revenueByMonth,
      leadSources
    };

    return serializeData({ success: true, metrics });
  } catch (error) {
    console.error("getAdminCrmMetrics error:", error);
    return serializeData({ success: false, error: "Failed to fetch admin metrics" });
  }
}

/**
 * Get personalized metrics for the User CRM Dashboard (or all for Admin)
 */
export async function getUserCrmMetrics(isAdminView: boolean = false, selectedUserId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return serializeData({ success: false, error: "Unauthorized" });

    const userId = session.user.id;
    const now = new Date();
    
    // Start of today (midnight)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // End of today
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let targetUserId = userId;
    let fetchAll = false;

    // Permission check for admin view
    if (isAdminView) {
      const canManage = await checkPermission(userId, "crm", "manage");
      const isSystemAdmin = session.user.role?.toLowerCase() === 'admin' || session.user.role?.toLowerCase() === 'superadmin';
      if (!canManage && !isSystemAdmin) {
        return serializeData({ success: false, error: "Permission Denied: crm.manage" });
      }

      if (!selectedUserId || selectedUserId === "all") {
        fetchAll = true;
      } else {
        targetUserId = selectedUserId;
      }
    }

    const ownerFilter = fetchAll ? {} : { ownerId: targetUserId };
    const taskFilter = fetchAll ? {} : { OR: [{ assigneeId: targetUserId }, { userId: targetUserId }] };
    const activityFilter = fetchAll ? {} : { OR: [{ ownerId: targetUserId }, { assignedToId: targetUserId }] };
    const eventFilter = fetchAll ? {} : {
        OR: [
            { ownerId: targetUserId }, 
            { assignedToId: targetUserId },
            {
              metadata: {
                path: ['attendees'],
                array_contains: targetUserId
              }
            }
        ]
    };
    const userFilter = fetchAll ? {} : { userId: targetUserId };

    const [
      myOpportunities,
      overdueTasks,
      todayTasks,
      upcomingEvents,
      recentAssignedLeads,
      tasksCompletedToday,
      meetingsHeldToday,
      callsLoggedToday,
      importantNotes,
      newAssignedOpportunities
    ] = await Promise.all([
      // User's Pipeline Summary
      prisma.opportunity.aggregate({
        where: { 
          ...ownerFilter,
          stage: { notIn: [OpportunityStage.WON, OpportunityStage.LOST] } 
        },
        _sum: { value: true },
        _count: true
      }),

      // Overdue Tasks assigned to or created by user
      prisma.task.findMany({
        where: {
          ...taskFilter,
          status: { notIn: ['completed', 'cancelled'] },
          dueDate: { lt: todayStart }
        },
        include: {
          User: { select: { name: true } },
          Assignee: { select: { name: true } },
          Lead: { select: { id: true, name: true } },
          Opportunity: { select: { id: true, title: true } },
          Contact: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),

      // Tasks Due Today
      prisma.task.findMany({
        where: {
          ...taskFilter,
          status: { notIn: ['completed', 'cancelled'] },
          dueDate: { gte: todayStart, lte: todayEnd }
        },
        include: {
          User: { select: { name: true } },
          Assignee: { select: { name: true } },
          Lead: { select: { id: true, name: true } },
          Opportunity: { select: { id: true, title: true } },
          Contact: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),

      // Upcoming Events where user is owner or assignee
      prisma.activity.findMany({
        where: {
          type: { in: ['EVENT_SCHEDULED', 'LOG_CALL', 'LOG_EMAIL'] },
          ...eventFilter,
          dueDate: { gte: todayStart }
        },
        include: {
          Owner: { select: { name: true } },
          AssignedTo: { select: { name: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),

      // Recently assigned leads (needs attention)
      prisma.lead.findMany({
        where: { 
          ...ownerFilter, 
          isTrash: false,
          status: 'NEW' 
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, company: true, createdAt: true }
      }),

      // Tasks completed today
      prisma.task.count({
        where: {
          ...taskFilter,
          status: 'completed',
          updatedAt: { gte: todayStart, lte: todayEnd }
        }
      }),

      // Meetings held today
      prisma.activity.count({
        where: {
          ...activityFilter,
          type: 'EVENT_SCHEDULED', // Adjust this if there's a specific MEETING type, EVENT_SCHEDULED seems to be what was used
          dueDate: { gte: todayStart, lte: todayEnd }
        }
      }),

      // Calls logged today
      prisma.activity.count({
        where: {
          ...activityFilter,
          type: 'LOG_CALL', // Common activity type for calls
          createdAt: { gte: todayStart, lte: todayEnd }
        }
      }),

      // Important Notes
      prisma.note.findMany({
        where: { ...userFilter },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          User: { select: { name: true } },
          Lead: { select: { id: true, name: true } },
          Opportunity: { select: { id: true, title: true } },
          Contact: { select: { id: true, firstName: true, lastName: true } }
        }
      }),

      // New Assigned Opportunities
      prisma.opportunity.findMany({
        where: {
          ...ownerFilter,
          stage: 'DISCOVERY' // Treating discovery stage as 'newly assigned'
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, value: true, createdAt: true, Client: { select: { name: true } } }
      })
    ]);

    const mappedUpcomingEvents = await Promise.all(upcomingEvents.map(async (e) => {
      let moduleName = null;
      let moduleUrl = null;

      if (e.contextType && e.contextId) {
        if (e.contextType === 'lead') {
          const lead = await prisma.lead.findUnique({ where: { id: e.contextId }, select: { name: true } });
          if (lead) { moduleName = `Lead: ${lead.name}`; moduleUrl = `/dashboard/crm/leads/${e.contextId}`; }
        } else if (e.contextType === 'opportunity') {
          const opp = await prisma.opportunity.findUnique({ where: { id: e.contextId }, select: { title: true } });
          if (opp) { moduleName = `Opp: ${opp.title}`; moduleUrl = `/dashboard/crm/opportunities/${e.contextId}`; }
        } else if (e.contextType === 'contact') {
          const contact = await prisma.contact.findUnique({ where: { id: e.contextId }, select: { firstName: true, lastName: true } });
          if (contact) { moduleName = `Contact: ${contact.firstName} ${contact.lastName || ""}`.trim(); moduleUrl = `/dashboard/crm/contacts/${e.contextId}`; }
        }
      }

      let assigneeNames: string[] = [];
      if (e.AssignedTo?.name) {
          assigneeNames.push(e.AssignedTo.name);
      }
      
      const attendeesData = (e.metadata as any)?.attendees;
      if (Array.isArray(attendeesData) && attendeesData.length > 0) {
          const attendeeUsers = await prisma.user.findMany({
              where: { id: { in: attendeesData } },
              select: { name: true }
          });
          attendeeUsers.forEach(u => u.name && assigneeNames.push(u.name));
      }

      const eventType = (e.metadata as any)?.eventType || e.type;

      return {
        id: e.id,
        title: e.subject,
        type: eventType,
        status: e.status,
        startTime: e.dueDate,
        endTime: e.completedAt || e.dueDate,
        owner: e.Owner?.name,
        assignees: Array.from(new Set(assigneeNames)),
        moduleName,
        moduleUrl
      };
    }));

    const metrics = {
      myPipelineValue: myOpportunities._sum.value || 0,
      myPipelineCount: myOpportunities._count || 0,
      tasksCompletedToday,
      meetingsHeldToday,
      callsLoggedToday,
      overdueTasks,
      todayTasks,
      upcomingEvents: mappedUpcomingEvents,
      newAssignedLeads: recentAssignedLeads,
      importantNotes,
      newAssignedOpportunities
    };

    return serializeData({ success: true, metrics });
  } catch (error) {
    console.error("getUserCrmMetrics error:", error);
    return serializeData({ success: false, error: "Failed to fetch user metrics" });
  }
}
