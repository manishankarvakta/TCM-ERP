import { SECTION_REGISTRY } from '@/components/quotation/sectionRegistry';
import type { SectionType } from '@/components/quotation/builder/SectionTypeIcon';

/**
 * Normalizes section metadata at runtime by merging it with the
 * defaultMetadata defined in the sectionRegistry.
 * This guarantees that required fields (like arrays) always exist,
 * preventing UI crashes when dealing with malformed or missing metadata.
 * 
 * @param sectionType - The type of the section being rendered
 * @param metadata - The existing metadata from the database or state
 * @returns The normalized metadata object
 */
export function normalizeSectionMetadata(sectionType: SectionType, metadata: any): Record<string, any> {
  const registryEntry = SECTION_REGISTRY[sectionType];
  const defaultMetadata = registryEntry?.defaultMetadata || {};

  // If there's no incoming metadata at all, return a clone of the defaults
  if (!metadata || typeof metadata !== 'object') {
    return JSON.parse(JSON.stringify(defaultMetadata));
  }

  // Deep merge strategy: ensure arrays exist where expected
  const normalized = { ...metadata };

  for (const [key, defaultValue] of Object.entries(defaultMetadata)) {
    // If the expected value is an array, but the incoming metadata doesn't have it (or isn't an array)
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(normalized[key])) {
        normalized[key] = []; // Fallback to empty array
      }
    } 
    // If it's undefined/null in incoming but has a default
    else if (normalized[key] === undefined || normalized[key] === null) {
      normalized[key] = defaultValue;
    }
  }

  return normalized;
}
