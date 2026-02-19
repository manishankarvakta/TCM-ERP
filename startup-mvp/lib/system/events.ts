import { prisma } from "@/lib/prisma";
import { SystemEntityType } from "./types";
import { ActivityType } from "./activity-types";

export const SystemEventDomain = {
  async get(id: string) {
    return await prisma.activity.findUnique({
      where: { id },
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
  },

  async create(data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    location?: string;
    status?: string;
    eventType?: string;
    allDay?: boolean;
    reminder?: string;
    entityType: SystemEntityType;
    entityId: string;
    ownerId: string;
    attendees?: any;
  }) {
    return await prisma.activity.create({
      data: {
        type: ActivityType.EVENT_SCHEDULED,
        subject: data.title,
        description: data.description,
        dueDate: data.startTime,
        completedAt: data.endTime,
        contextType: data.entityType,
        contextId: data.entityId,
        ownerId: data.ownerId,
        status: data.status || "TODO",
        metadata: {
          attendees: data.attendees ?? [],
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
          eventType: data.eventType,
          allDay: data.allDay,
          reminder: data.reminder,
        } as any,
      } as any,
    });
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      startTime: Date;
      endTime: Date;
      location: string;
      status: string;
      eventType: string;
      allDay: boolean;
      reminder: string;
      attendees: any;
    }>
  ) {
    const updateData: any = {};
    if (data.title) updateData.subject = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime) updateData.dueDate = data.startTime;
    if (data.endTime) updateData.completedAt = data.endTime;
    if (data.status) updateData.status = data.status;

    // Fetch existing metadata to merge
    const existing = await prisma.activity.findUnique({ where: { id }, select: { metadata: true } });
    const existingMetadata = (existing?.metadata as any) || {};

    const newMetadata = {
        ...existingMetadata,
        ...(data.attendees && { attendees: data.attendees }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.eventType !== undefined && { eventType: data.eventType }),
        ...(data.allDay !== undefined && { allDay: data.allDay }),
        ...(data.reminder !== undefined && { reminder: data.reminder }),
    };

    updateData.metadata = newMetadata;

    return await prisma.activity.update({
      where: { id },
      data: updateData as any,
    });
  },

  async delete(id: string) {
    return await prisma.activity.delete({
      where: { id },
    });
  },

  async getByEntity(
    entityType: SystemEntityType, 
    entityId: string,
    limit: number = 20,
    cursor?: string
  ) {
    const events = await prisma.activity.findMany({
      where: {
        contextType: entityType,
        contextId: entityId,
        type: ActivityType.EVENT_SCHEDULED
      } as any,
      include: {
        Owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: {
        dueDate: "asc", // Order events by start time instead of creation
      },
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, -1) : events;

    return {
      events: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  },
};
