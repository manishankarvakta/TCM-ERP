import { SystemEntityType } from "@/lib/system/types";
import { getSystemTasks } from "@/app/actions/system/tasks";
import { getSystemNotes } from "@/app/actions/system/notes";
import { getSystemEvents } from "@/app/actions/system/events";
import { getSystemDocs } from "@/app/actions/system/docs";
import { getSystemFiles } from "@/app/actions/system/files";
import { getSystemTimeline } from "@/app/actions/system/timeline";

export const getSystemModules = async (entityType: SystemEntityType, entityId: string) => {
    const [tasks, notes, events, docs, files, timeline] = await Promise.all([
        getSystemTasks(entityType, entityId),
        getSystemNotes(entityType, entityId),
        getSystemEvents(entityType, entityId),
        getSystemDocs(entityType, entityId),
        getSystemFiles(entityType, entityId),
        getSystemTimeline(entityType, entityId)
    ]);

    return {
        tasks,
        notes,
        events,
        docs,
        files,
        timeline
    };
};
