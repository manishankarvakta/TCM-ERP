/**
 * getDefaultSections
 *
 * Returns the 9 core proposal sections that must be created for every new
 * quotation. Optional / library sections are added later via the
 * SectionLibraryModal.
 *
 * All data fields for new section types live inside `metadata`.
 * Pricing-related fields (items / groups / categoryGroups / discount / total)
 * are only set on the PRICING section.
 */

export interface DefaultSection {
  id: string;
  title: string;
  sectionType: string;
  sortOrder: number;
  /** Pricing fields — only populated for PRICING section */
  items: any[];
  groups: any[];
  categoryGroups: any[];
  discount: number;
  total: number;
  grandTotal: number;
  /** All new section types store their fields here */
  metadata: Record<string, any>;
}

const CORE_SECTIONS: Array<{ sectionType: string; title: string }> = [
  { sectionType: 'COVER',           title: 'Cover Letter' },
  { sectionType: 'CLIENT_INFO',     title: 'Client Information' },
  { sectionType: 'PROJECT_SUMMARY', title: 'Project Summary' },
  { sectionType: 'SCOPE',           title: 'Scope of Work' },
  { sectionType: 'TIMELINE',        title: 'Project Timeline' },
  { sectionType: 'PRICING',         title: 'Pricing' },
  { sectionType: 'PAYMENT_TERMS',   title: 'Payment Terms' },
  { sectionType: 'LEGAL_TERMS',     title: 'Legal Terms & Conditions' },
  { sectionType: 'ACCEPTANCE',      title: 'Acceptance' },
];

export function getDefaultSections(): DefaultSection[] {
  return CORE_SECTIONS.map((s, index) => ({
    id: `section-default-${s.sectionType.toLowerCase()}-${Date.now()}-${index}`,
    title: s.title,
    sectionType: s.sectionType,
    sortOrder: index,
    items: [],
    groups: [],
    categoryGroups: [],
    discount: 0,
    total: 0,
    grandTotal: 0,
    metadata: {},
  }));
}

/**
 * makeBlankSection
 *
 * Creates a single blank section for a given type (used by the library modal).
 */
export function makeBlankSection(
  sectionType: string,
  title: string,
  sortOrder = 0,
): DefaultSection {
  return {
    id: `section-${sectionType.toLowerCase()}-${Date.now()}`,
    title,
    sectionType,
    sortOrder,
    items: [],
    groups: [],
    categoryGroups: [],
    discount: 0,
    total: 0,
    grandTotal: 0,
    metadata: {},
  };
}
