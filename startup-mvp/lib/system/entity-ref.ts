import { SystemEntityType } from "./types";

export interface EntityRef {
  entityType: SystemEntityType;
  entityId: string;
}

/**
 * Validates if the provided object is a valid EntityRef.
 * Checks for presence of entityType and entityId, and verifies entityType is a known SystemEntityType.
 */
export function isValidEntityRef(ref: any): ref is EntityRef {
  if (!ref || typeof ref !== 'object') return false;
  
  const { entityType, entityId } = ref;

  if (typeof entityId !== 'string' || !entityId) return false;
  
  // Validate entityType against the allowed values
  const validTypes: SystemEntityType[] = [
    'lead',
    'opportunity',
    'client',
    'contact',
    'quotation',
    'order',
    'invoice',
    'project',
    'task',
    'issue',
    'user'
  ];

  return validTypes.includes(entityType);
}

/**
 * Helper to create a standardized EntityRef object
 */
export function createEntityRef(entityType: SystemEntityType, entityId: string): EntityRef {
  return { entityType, entityId };
}
