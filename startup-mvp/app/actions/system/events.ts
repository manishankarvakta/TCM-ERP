'use server'

import { SystemEventDomain } from "@/lib/system/events";
import { checkSystemPermission } from "@/lib/system/permissions";
import { emitSystemEvent } from "@/lib/system/hooks";
import { getCurrentUser } from "@/lib/session";
import { auth } from "@/lib/auth"; // Added auth import
import { SystemEntityType } from "@/lib/system/types";
import { revalidatePath } from "next/cache";

export async function createSystemEvent(data: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    status?: string;
    eventType?: string;
    allDay?: boolean;
    reminder?: string;
    entityType: SystemEntityType;
    entityId: string;
    attendees?: any[];
}) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const hasPermission = await checkSystemPermission('system.events', 'create', {
        entityType: data.entityType,
        entityId: data.entityId
    });

    if (!hasPermission) throw new Error("Permission denied");

    const event = await SystemEventDomain.create({
        ...data,
        startTime: data.startDate,
        endTime: data.endDate,
        ownerId: user.id
    });

    revalidatePath(`/dashboard/crm/${data.entityType}s/${data.entityId}`);
    return { success: true, data: event };
}

export async function updateSystemEvent(id: string, data: {
    title?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
    status?: string;
    eventType?: string;
    allDay?: boolean;
    reminder?: string;
    attendees?: any[];
}) {
    const user = await getCurrentUser();
    const session = await auth(); 
    if (!user || !session?.user) throw new Error("Unauthorized");

    // Check permission - now fetching event first to get context and do change tracking
    const oldEvent = await SystemEventDomain.get(id);
    if (!oldEvent) throw new Error("Event not found");

    const hasPermission = await checkSystemPermission('system.events', 'update', {
        entityType: (oldEvent as any).contextType,
        entityId: (oldEvent as any).contextId
    });
    if (!hasPermission) throw new Error("Permission denied");

    const event = await SystemEventDomain.update(id, {
        ...data,
        startTime: data.startDate, // Ensure mapping if present
        endTime: data.endDate,
    } as any);

    // Structured Change Tracking
    const changes: any[] = [];
    
    if (data.title && data.title !== oldEvent.subject) {
        changes.push({ field: "title", from: oldEvent.subject, to: data.title });
    }
    if (data.description !== undefined && data.description !== oldEvent.description) {
        changes.push({ field: "description", from: oldEvent.description, to: data.description });
    }
    if (data.status && data.status !== oldEvent.status) {
        changes.push({ field: "status", from: oldEvent.status, to: data.status });
    }
    
    // Dates
    const oldStart = oldEvent.dueDate ? oldEvent.dueDate.toISOString() : null;
    const newStart = data.startDate ? data.startDate.toISOString() : null;
    if (newStart && newStart !== oldStart) {
        changes.push({ field: "startDate", from: oldStart, to: newStart });
    }

    // Metadata changes (Location, All Day, Event Type)
    const oldMetadata = (oldEvent.metadata as any) || {};

    if (data.location !== undefined && data.location !== oldMetadata.location) {
        changes.push({ field: "location", from: oldMetadata.location, to: data.location });
    }
    if (data.allDay !== undefined && data.allDay !== oldMetadata.allDay) {
        changes.push({ field: "allDay", from: oldMetadata.allDay, to: data.allDay });
    }
    if (data.eventType !== undefined && data.eventType !== oldMetadata.eventType) {
        changes.push({ field: "type", from: oldMetadata.eventType, to: data.eventType }); // Labelled as 'type' for user clarity
    }

    const oldEnd = (oldEvent as any).completedAt ? (oldEvent as any).completedAt.toISOString() : null;
    const newEnd = data.endDate ? data.endDate.toISOString() : null;
    if (newEnd && newEnd !== oldEnd) {
        changes.push({ field: "endDate", from: oldEnd, to: newEnd });
    }

    if (changes.length > 0) {
         await emitSystemEvent({
            entityType: (event as any).contextType,
            entityId: (event as any).contextId,
            eventType: 'EVENT_UPDATED',
            actorId: session.user.id,
            description: `Event updated: ${event.subject}`,
            metadata: { 
                eventId: event.id,
                changes 
            }
        });
    }

    revalidatePath(`/dashboard/crm/${(event as any).contextType}s/${(event as any).contextId}`);
    return { success: true, data: event };
}

// Fetches events for a specific CRM entity (cursor-based pagination for timeline)
export async function getSystemEvents(
    entityType: SystemEntityType, 
    entityId: string,
    limit: number = 20,
    cursor?: string
) {
    const hasPermission = await checkSystemPermission('system.events', 'read', {
        entityType,
        entityId
    });
    
    if (!hasPermission) return { events: [], hasMore: false, nextCursor: null };

    const result = await SystemEventDomain.getByEntity(entityType, entityId, limit, cursor);
    
    // Map Activity to EventItem structure
    const mappedEvents = result.events.map((event: any) => ({
        ...event,
        title: event.subject,
        startTime: event.dueDate,
        endTime: event.completedAt,
        location: event.metadata?.location || null,
        allDay: event.metadata?.allDay || false,
        eventType: event.metadata?.eventType || null,
        reminder: event.metadata?.reminder || null,
        attendees: event.metadata?.attendees || [], // Correctly map participants
        status: event.status,
        owner: event.Owner // Include owner data for avatars
    }));

    return {
        ...result,
        events: mappedEvents
    };
}


