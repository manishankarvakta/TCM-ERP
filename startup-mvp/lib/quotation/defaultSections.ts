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
  items?: any[];
  groups?: any[];
  categoryGroups?: any[];
  discount?: number;
  total?: number;
  grandTotal?: number;
  /** All new section types store their fields here */
  metadata: Record<string, any>;
}

const CORE_SECTIONS: Array<{ sectionType: string; title: string }> = [
  { sectionType: 'COVER',           title: 'Cover Letter' },
  { sectionType: 'CLIENT_INFO',     title: 'Client Information' },
  { sectionType: 'PROJECT_SUMMARY', title: 'Project Summary' },
  { sectionType: 'SCOPE',           title: 'Scope of Work' },
  { sectionType: 'PRICING',         title: 'Pricing' },
  { sectionType: 'LEGAL_TERMS',     title: 'Terms and Conditions' },
  { sectionType: 'ACCEPTANCE',      title: 'Acceptance' },
];

import { SECTION_REGISTRY } from '@/components/quotation/sectionRegistry';
import type { SectionType } from '@/components/quotation/builder/SectionTypeIcon';

export function getDefaultSections(): DefaultSection[] {
  return CORE_SECTIONS.map((s, index) => {
    const config = SECTION_REGISTRY[s.sectionType as SectionType];
    const section: DefaultSection = {
      id: `section-default-${s.sectionType.toLowerCase()}-${Date.now()}-${index}`,
      title: s.title,
      sectionType: s.sectionType,
      sortOrder: index,
      metadata: config?.defaultMetadata ? JSON.parse(JSON.stringify(config.defaultMetadata)) : {},
    };

    if (s.sectionType === 'PRICING') {
      section.items = [];
      section.groups = [];
      section.categoryGroups = [];
      section.discount = 0;
      section.total = 0;
      section.grandTotal = 0;
    }

    return section;
  });
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
  const config = SECTION_REGISTRY[sectionType as SectionType];
  const section: DefaultSection = {
    id: `section-${sectionType.toLowerCase()}-${Date.now()}`,
    title,
    sectionType,
    sortOrder,
    metadata: config?.defaultMetadata ? JSON.parse(JSON.stringify(config.defaultMetadata)) : {},
  };

  if (sectionType === 'PRICING') {
    section.items = [];
    section.groups = [];
    section.categoryGroups = [];
    section.discount = 0;
    section.total = 0;
    section.grandTotal = 0;
  }

  return section;
}
