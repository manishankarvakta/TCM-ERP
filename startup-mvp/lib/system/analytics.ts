import { prisma } from "@/lib/prisma";
import { SystemEntityType } from "./types";

export interface SystemAnalyticsDTO {
    metric: string;
    value: number;
    entityType: SystemEntityType;
    entityId: string;
    metadata?: any;
}

export const SystemAnalyticsDomain = {
    async recordMetric(data: SystemAnalyticsDTO) {
        return await (prisma as any).analytics.create({
            data: {
                metric: data.metric,
                value: data.value,
                entityType: data.entityType,
                entityId: data.entityId,
                metadata: data.metadata || {},
            },
        });
    },

    async getMetrics(entityType: SystemEntityType, entityId: string) {
        return await (prisma as any).analytics.findMany({
            where: {
                entityType,
                entityId,
            },
            orderBy: {
                timestamp: "desc",
            },
        });
    },
};
