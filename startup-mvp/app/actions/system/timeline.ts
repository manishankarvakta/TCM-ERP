import { getEntityTimeline } from "@/lib/system/activity-ledger";
import { checkSystemPermission } from "@/lib/system/permissions";
import { SystemEntityType } from "@/lib/system/types";

export async function getSystemTimeline(
    entityType: SystemEntityType, 
    entityId: string,
    limit: number = 20,
    cursor?: string
) {
    const hasPermission = await checkSystemPermission('system.timeline', 'read', {
        entityType,
        entityId
    });
    
    if (!hasPermission) return { events: [], hasMore: false, nextCursor: null };

    const result = await getEntityTimeline(entityType, entityId, { limit, cursor });

    return {
        events: result.activities || [],
        hasMore: result.hasMore || false,
        nextCursor: result.nextCursor
    };
}
