import { EntityRef } from "./entity-ref";
import { createActivityRecord } from "./activity-ledger";
import { NotificationService } from "./notification-service";
import { ActivityType } from "./activity-types";

export const SystemEvents = {
  async emitEntityCreated(entityRef: EntityRef, actorId: string, actorName: string) {
    await createActivityRecord({
        type: "CREATED", // Or specific type if available
        actorId: actorId,
        subject: "Entity created",
        description: "Entity created",
        contextType: entityRef.entityType,
        contextId: entityRef.entityId,
    });
    // Notifications logic can be added here
  },

  async emitStatusChanged(entityRef: EntityRef, actorId: string, oldStatus: string, newStatus: string) {
    await createActivityRecord({
        type: ActivityType.STATUS_CHANGED,
        actorId: actorId,
        subject: `Status changed from ${oldStatus} to ${newStatus}`,
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        contextType: entityRef.entityType,
        contextId: entityRef.entityId,
        metadata: { oldStatus, newStatus } as any
    });
  },

  async emitStageChanged(entityRef: EntityRef, actorId: string, oldStage: string, newStage: string) {
    await createActivityRecord({
        type: "STAGE_CHANGE", // Add to ActivityType if missing
        actorId: actorId,
        subject: `Stage changed from ${oldStage} to ${newStage}`,
        description: `Stage changed from ${oldStage} to ${newStage}`,
        contextType: entityRef.entityType,
        contextId: entityRef.entityId,
        metadata: { oldStage, newStage } as any
    });
  },

  async emitTaskAssigned(entityRef: EntityRef, actorId: string, assigneeId: string, taskTitle: string) {
    await createActivityRecord({
        type: ActivityType.TASK_ASSIGNED,
        actorId: actorId,
        subject: `Task assigned: ${taskTitle}`,
        description: `Task assigned to user ${assigneeId}`,
        contextType: entityRef.entityType,
        contextId: entityRef.entityId,
        metadata: { assigneeId, taskTitle } as any
    });
    
    await NotificationService.createNotification(
        assigneeId,
        "TASK_ASSIGNED",
        "New Task Assigned",
        `You have been assigned to task: ${taskTitle}`,
        entityRef
    );
  },

  async emitFileUploaded(entityRef: EntityRef, actorId: string, fileName: string) {
    await createActivityRecord({
        type: "FILE_UPLOAD", // Add to ActivityType if missing
        actorId: actorId,
        subject: `File uploaded: ${fileName}`,
        description: `File uploaded: ${fileName}`,
        contextType: entityRef.entityType,
        contextId: entityRef.entityId,
        metadata: { fileName } as any
    });
  }
};
