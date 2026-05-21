import { prisma } from "@/lib/prisma";

export const AnalyticsService = {
  async getLeadStats() {
    const total = await prisma.lead.count();
    // Assuming status is an enum or string. Using groupBy for distribution.
    const byStatus = await prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    return { total, byStatus };
  },

  async getPipelineValue() {
    const result = await prisma.opportunity.aggregate({
      _sum: { value: true }
    });
    return result._sum.value || 0;
  },

  async getDealsByStage() {
    return await prisma.opportunity.groupBy({
      by: ['stage'],
      _count: { id: true },
      _sum: { value: true }
    });
  },

  async getTasksDueToday() {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date();
    end.setHours(23,59,59,999);
    
    return await prisma.systemTask.count({
      where: {
        dueDate: {
          gte: start,
          lte: end
        },
        status: { not: 'completed' }
      }
    });
  },

  async getOverdueActivities() {
    return await prisma.activity.count({
      where: {
        dueDate: { lt: new Date() },
        completed: false
      }
    });
  },
  
  async getConversionRate() {
      // Very basic implementation: Won Opportunities / Total Opportunities
      const total = await prisma.opportunity.count();
      const won = await prisma.opportunity.count({
          where: { stage: 'WON' as any } // Casting as any to avoid enum type issues if not imported
      });
      return total > 0 ? (won / total) * 100 : 0;
  },

  // -------------------------------------------------------------
  // ENTERPRISE PROJECT ANALYTICS ENGINE
  // -------------------------------------------------------------

  async getProjectVelocity(projectId: string) {
      // Returns tasks completed per week for the last 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      const tasks = await prisma.task.findMany({
          where: { 
              entityType: 'project', 
              entityId: projectId, 
              status: { in: ['done', 'completed'] },
              updatedAt: { gte: fourWeeksAgo }
          },
          select: { updatedAt: true, estimatedHours: true }
      });

      // Aggregate in memory (safe because dataset is tightly bounded by 4 weeks & 1 project)
      const weeklyVelocity = [0,0,0,0];
      const now = new Date().getTime();
      
      tasks.forEach(t => {
          const weekDiff = Math.floor((now - t.updatedAt.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weekDiff >= 0 && weekDiff < 4) {
              weeklyVelocity[3 - weekDiff] += (Number(t.estimatedHours) || 1); // fallback to 1 if no estimate
          }
      });

      return [
          { name: "Week -3", velocity: weeklyVelocity[0] },
          { name: "Week -2", velocity: weeklyVelocity[1] },
          { name: "Last Week", velocity: weeklyVelocity[2] },
          { name: "This Week", velocity: weeklyVelocity[3] },
      ];
  },

  async getProjectBurndown(projectId: string) {
      // Total estimated vs total physically logged
      const totalEstQuery = await prisma.task.aggregate({
          where: { entityType: 'project', entityId: projectId },
          _sum: { estimatedHours: true }
      });
      const totalEst = Number(totalEstQuery._sum.estimatedHours || 0);

      const loggedQuery = await prisma.timesheet.aggregate({
          where: { projectId, status: 'APPROVED' },
          _sum: { hours: true }
      });
      const totalLogged = Number(loggedQuery._sum.hours || 0);

      return {
          totalEstimated: totalEst,
          totalLogged: totalLogged,
          remaining: Math.max(0, totalEst - totalLogged)
      };
  },

  async getGlobalDelayRisks() {
      // Detect tasks due imminently that still require massive effort
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      return await prisma.task.findMany({
          where: {
              status: { notIn: ['done', 'completed', 'archived'] },
              dueDate: { lte: threeDaysFromNow }
          },
          select: {
              id: true, title: true, dueDate: true, estimatedHours: true, entityId: true, assigneeId: true
          },
          take: 5,
          orderBy: { dueDate: 'asc' }
      });
  }
};
