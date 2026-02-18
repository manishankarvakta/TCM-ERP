import { prisma } from "@/lib/prisma";
import { SystemEntityType } from "./types";

export const SystemDocDomain = {
  async create(data: {
    title: string;
    content?: string;
    status?: string;
    entityType: SystemEntityType;
    entityId: string;
    authorId: string;
  }) {
    return await (prisma as any).doc.create({
      data: {
        title: data.title,
        content: data.content,
        status: data.status || "draft",
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.authorId,
      },
    });
  },

  async update(id: string, data: Partial<{ title: string; content: string; status: string }>) {
    return await (prisma as any).doc.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return await (prisma as any).doc.delete({
      where: { id },
    });
  },

  async getByEntity(entityType: SystemEntityType, entityId: string) {
    return await (prisma as any).doc.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },
  
  async getById(id: string) {
    return await (prisma as any).doc.findUnique({
      where: { id },
      include: {
        User: {
            select: {
                id: true,
                name: true,
                image: true,
            }
        }
    }
    });
  }
};
