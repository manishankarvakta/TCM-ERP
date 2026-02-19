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
  }
};
