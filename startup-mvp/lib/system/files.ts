import { prisma } from "@/lib/prisma";
import { SystemEntityType } from "./types";

export const SystemFileDomain = {
  // Link an existing file to an entity
  async linkFile(data: {
    fileId: string;
    entityType: SystemEntityType;
    entityId: string;
    docType?: string;
  }) {
    // Check if link already exists to avoid unique constraint error
    const existing = await (prisma as any).entityFileLink.findUnique({
      where: {
        fileId_entityType_entityId: {
          fileId: data.fileId,
          entityType: data.entityType,
          entityId: data.entityId,
        },
      },
    });

    if (existing) return existing;

    return await (prisma as any).entityFileLink.create({
      data: {
        fileId: data.fileId,
        entityType: data.entityType,
        entityId: data.entityId,
        docType: data.docType,
      },
    });
  },

  // Unlink a file from an entity
  async unlinkFile(fileId: string, entityType: SystemEntityType, entityId: string) {
    return await (prisma as any).entityFileLink.delete({
      where: {
        fileId_entityType_entityId: {
          fileId,
          entityType,
          entityId,
        },
      },
    });
  },

  // Get files linked to an entity
  async getByEntity(entityType: SystemEntityType, entityId: string) {
    const relations = await (prisma as any).entityFileLink.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        File: true, // Fetch the actual file metadata
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Flatten the result to return File objects
    return relations.map((r: any) => r.File);
  },
};
