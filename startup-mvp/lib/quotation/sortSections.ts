import { DEFAULT_SECTION_ORDER } from '@/lib/quotation/buildDefaultSections';
import type { SectionType } from '@/components/quotation/builder/SectionTypeIcon';

export interface SortableSection {
  displayOrder?: number | null;
  sectionType?: string | SectionType | null;
  [key: string]: any;
}

/**
 * Sorts an array of quotation sections by displayOrder.
 * 
 * If displayOrder is missing, null, or matching, it falls back to parsing
 * the index in the DEFAULT_SECTION_ORDER array.
 * 
 * @param sections - The array of sections to sort
 * @returns A new sorted array of sections
 */
export function sortSectionsByDisplayOrder<T extends SortableSection>(sections: T[] | undefined | null): T[] {
  if (!sections || !Array.isArray(sections)) {
    return [];
  }

  // Clone to avoid mutating original array
  return [...sections].sort((a, b) => {
    const orderA = a.displayOrder;
    const orderB = b.displayOrder;

    // Both have display orders defined and they are different
    if (typeof orderA === 'number' && typeof orderB === 'number' && orderA !== orderB) {
      return orderA - orderB;
    }

    // Fallback logic for missing, matching, or null displayOrders
    // Get their index in the default static registry order (default to a very high number if not found)
    const indexA = a.sectionType ? DEFAULT_SECTION_ORDER.indexOf(a.sectionType as SectionType) : -1;
    const fallbackA = indexA !== -1 ? indexA : 999;
    
    const indexB = b.sectionType ? DEFAULT_SECTION_ORDER.indexOf(b.sectionType as SectionType) : -1;
    const fallbackB = indexB !== -1 ? indexB : 999;

    return fallbackA - fallbackB;
  });
}
