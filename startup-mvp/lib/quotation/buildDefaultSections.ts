import { SECTION_REGISTRY } from '@/components/quotation/sectionRegistry';
import { Prisma } from '@prisma/client';
import { SectionType } from '@/components/quotation/builder/SectionTypeIcon';

export const DEFAULT_SECTION_ORDER: SectionType[] = [
  'COVER',
  'PROJECT_SUMMARY',
  'SCOPE',
  'TECHNICAL_APPROACH',
  'ARCHITECTURE_OVERVIEW',
  'TEAM_STRUCTURE',
  'PRICING',
  'LEGAL_TERMS'
];

export function buildDefaultSections(paymentTerms?: string | null) {
  return DEFAULT_SECTION_ORDER.map((sectionType, index) => {
    const registryEntry = SECTION_REGISTRY[sectionType];
    
    if (!registryEntry) {
      console.warn(`Warning: SectionType ${sectionType} not found in SECTION_REGISTRY.`);
    }

    const section: any = {
      sectionType: sectionType,
      title: registryEntry?.label || sectionType,
      isEnabled: true,
      displayOrder: index + 1,
      sortOrder: index,
      metadata: registryEntry?.defaultMetadata ? JSON.parse(JSON.stringify(registryEntry.defaultMetadata)) : {},
    };

    // Special Case: Inject default payment terms into Legal Terms if provided
    if (sectionType === 'LEGAL_TERMS' && paymentTerms) {
      section.metadata = {
        ...(section.metadata || {}),
        paymentTerms: paymentTerms
      };
      // For backward compatibility / display in some areas
      section.paymentTerms = paymentTerms;
    }

    if (sectionType === 'PRICING') {
      section.discount = new Prisma.Decimal(0);
      section.total = new Prisma.Decimal(0);
      section.grandTotal = new Prisma.Decimal(0);
    }

    return section;
  });
}
