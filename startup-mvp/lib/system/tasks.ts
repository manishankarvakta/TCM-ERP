import { prisma } from "@/lib/prisma";
import { SystemEntityType } from "./types";

export const SystemTaskDomain = {
  async create(data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: Date;
    assignedToId?: string;
    entityType: SystemEntityType;
    entityId: string;
    createdById: string;
  }) {
    return await (prisma as any).task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || "todo",
        priority: data.priority || "medium",
        dueDate: data.dueDate,
        assigneeId: data.assignedToId,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.createdById,
      },
    });
  },

  async update(id: string, data: Partial<{ title: string; status: string; priority: string; dueDate: Date; assigneeId: string }>) {
    return await (prisma as any).task.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return await (prisma as any).task.delete({
      where: { id },
    });
  },

  async getByEntity(entityType: SystemEntityType, entityId: string) {
    return await (prisma as any).task.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};
