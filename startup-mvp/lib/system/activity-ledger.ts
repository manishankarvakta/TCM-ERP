/**
 * Activity Ledger Service
 * 
 * Centralized service for recording all meaningful business actions
 * with proper context/subject separation for timeline display.
 */

import { prisma } from "@/lib/prisma";
import { ActivityTypeValue } from "./activity-types";

interface CreateActivityParams {
  // Required
  type: ActivityTypeValue | string;
  subject: string;
  
  // Optional actor (system actions)
  actorId?: string;
  
  // Optional description
  description?: string;
  
  // Context (Timeline Owner - where activity appears)
  contextType?: string;
  contextId?: string;
  
  // Subject (Affected Object - what changed)
  subjectType?: string;
  subjectId?: string;
  
  // Optional metadata
  metadata?: Record<string, any>;

  // Optional scheduling fields
  dueDate?: Date;
  completed?: boolean;
  completedAt?: Date;
}

/**
 * Create an activity record in the ledger
 * 
 * This function is non-blocking - failures will be logged but won't throw errors
 * to prevent activity recording from breaking primary operations.
 * 
 * @param params Activity parameters
 * @returns Success status and activity record (if successful)
 */
export async function createActivityRecord(params: CreateActivityParams) {
  try {
    const activity = await prisma.activity.create({
      data: {
        type: params.type,
        subject: params.subject,
        description: params.description,
        ownerId: params.actorId,
        contextType: params.contextType,
        contextId: params.contextId,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        metadata: params.metadata,
        dueDate: params.dueDate,
        completed: params.completed,
        completedAt: params.completedAt,
      },
      include: {
        Owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    return { success: true, activity };
  } catch (error) {
    // Non-blocking: log error but don't throw
    console.error("[Activity Ledger] Failed to create activity record:", error);
    console.error("[Activity Ledger] Params:", params);
    return { success: false, error };
  }
}

/**
 * Get timeline for an entity (context-based query)
 * 
 * Returns all activities where the entity is the context (timeline owner)
 * 
 * @param entityType Type of entity (lead, opportunity, contact, etc.)
 * @param entityId ID of entity
 * @param options Pagination options
 * @returns Activities and pagination info
 */
export async function getEntityTimeline(
  entityType: string,
  entityId: string,
  options: {
    limit?: number;
    cursor?: string;
  } = {}
) {
  const { limit = 20, cursor } = options;
  
  try {
    const activities = await prisma.activity.findMany({
      where: {
        contextType: entityType,
        contextId: entityId,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        Owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, -1) : activities;
    
    return {
      success: true,
      activities: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  } catch (error) {
    console.error("[Activity Ledger] Failed to fetch entity timeline:", error);
    return {
      success: false,
      error,
      activities: [],
      hasMore: false,
      nextCursor: null,
    };
  }
}

/**
 * Get history for an object (subject-based query)
 * 
 * Returns all activities where the object is the subject (what changed)
 * 
 * @param objectType Type of object (task, note, doc, event, etc.)
 * @param objectId ID of object
 * @param options Pagination options
 * @returns Activities and pagination info
 */
export async function getObjectHistory(
  objectType: string,
  objectId: string,
  options: {
    limit?: number;
    cursor?: string;
  } = {}
) {
  const { limit = 20, cursor } = options;
  
  try {
    const activities = await prisma.activity.findMany({
      where: {
        subjectType: objectType,
        subjectId: objectId,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        Owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, -1) : activities;
    
    return {
      success: true,
      activities: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  } catch (error) {
    console.error("[Activity Ledger] Failed to fetch object history:", error);
    return {
      success: false,
      error,
      activities: [],
      hasMore: false,
      nextCursor: null,
    };
  }
}
