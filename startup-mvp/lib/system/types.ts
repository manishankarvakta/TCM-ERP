
export type SystemEntityType = 
  | 'lead' 
  | 'opportunity' 
  | 'client' 
  | 'contact' 
  | 'quotation' 
  | 'order' 
  | 'invoice' 
  | 'project' 
  | 'task' 
  | 'issue' 
  | 'user';

export type SystemEventType = 
  | 'ENTITY_CREATED' 
  | 'ENTITY_UPDATED' 
  | 'STATUS_CHANGED' 
  | 'STAGE_CHANGED' 
  | 'TASK_CREATED' 
  | 'TASK_COMPLETED' 
  | 'NOTE_CREATED' 
  | 'FILE_UPLOADED' 
  | 'DOC_ATTACHED' 
  | 'DOC_CREATED'
  | 'ACTIVITY_SCHEDULED' 
  | 'ACTIVITY_CREATED'
  | 'EVENT_SCHEDULED' 
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_CONVERTED'
  | 'OPPORTUNITY_CREATED'
  | 'OPPORTUNITY_UPDATED'
  | 'OPPORTUNITY_STAGE_CHANGED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'TASK_UPDATED'
  | 'NOTE_UPDATED'
  | 'DOC_UPDATED'
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED';

export type SystemNotificationType = 
  | 'LEAD_STATUS' 
  | 'OPPORTUNITY_STAGE' 
  | 'DEAL_WON' 
  | 'TASK_ASSIGNED' 
  | 'TASK_COMPLETED'
  | 'EVENT_INVITE' 
  | 'ISSUE_CREATED' 
  | 'MENTION' 
  | 'SYSTEM_ALERT';

export type SystemPermissionKey = 
  | 'system.tasks' 
  | 'system.notes' 
  | 'system.events' 
  | 'system.docs' 
  | 'system.files' 
  | 'system.timeline' 
  | 'system.notifications' 
  | 'system.analytics';

// Common Interfaces

export interface SystemMetadata {
  [key: string]: any;
}

export interface SystemEventPayload {
  entityType: SystemEntityType;
  entityId: string;
  eventType: SystemEventType;
  actorId: string;
  description: string;
  metadata?: SystemMetadata;
  
  // Optional Notification Config
  notification?: {
    recipientId: string;
    type: SystemNotificationType;
    title: string;
    message: string;
  };
}
