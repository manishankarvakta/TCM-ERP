import { prisma } from "@/lib/prisma";
import { SystemEntityType } from "./types";

export const SystemNoteDomain = {
  async create(data: {
    content: string;
    entityType: SystemEntityType;
    entityId: string;
    createdById: string;
  }) {
    return await (prisma as any).note.create({
      data: {
        content: data.content,
        title: "Note", 
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.createdById,
      },
    });
  },

  async update(id: string, content: string) {
    return await (prisma as any).note.update({
      where: { id },
      data: { content },
    });
  },

  async delete(id: string) {
    return await (prisma as any).note.delete({
      where: { id },
    });
  },

  async getByEntity(entityType: SystemEntityType, entityId: string) {
    return await (prisma as any).note.findMany({
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
