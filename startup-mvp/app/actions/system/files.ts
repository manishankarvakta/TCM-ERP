'use server'

import { SystemFileDomain } from "@/lib/system/files";
import { checkSystemPermission } from "@/lib/system/permissions";
import { emitSystemEvent } from "@/lib/system/hooks";
import { getCurrentUser } from "@/lib/session";
import { SystemEntityType } from "@/lib/system/types";
import { revalidatePath } from "next/cache";

export async function linkSystemFile(data: {
    fileId: string;
    entityType: SystemEntityType;
    entityId: string;
}) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const hasPermission = await checkSystemPermission('system.files', 'create', {
        entityType: data.entityType,
        entityId: data.entityId
    });

    if (!hasPermission) throw new Error("Permission denied");

    const link = await SystemFileDomain.linkFile(data);

    await emitSystemEvent({
        entityType: data.entityType,
        entityId: data.entityId,
        eventType: 'FILE_UPLOADED',
        actorId: user.id,
        description: `Attached file`,
        metadata: { fileId: data.fileId }
    });

    revalidatePath(`/${data.entityType}s/${data.entityId}`);
    return { success: true, data: link };
}

export async function getSystemFiles(entityType: SystemEntityType, entityId: string) {
    // View permission for files usually inherits from view permission of the entity
    const hasPermission = await checkSystemPermission('system.files', 'read', {
        entityType,
        entityId
    });
    
    if (!hasPermission) return [];

    return await SystemFileDomain.getByEntity(entityType, entityId);
}
