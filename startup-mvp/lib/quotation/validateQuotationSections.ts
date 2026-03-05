import { SECTION_REGISTRY } from '@/components/quotation/sectionRegistry';
import type { SectionType } from '@/components/quotation/builder/SectionTypeIcon';

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  sectionId?: string;
  sectionType?: string;
}

/**
 * Validates the structural integrity of quotation sections.
 * This is meant to be run in development mode to catch data inconsistencies early.
 * 
 * Checks for:
 * - Missing required sections (e.g., PRICING)
 * - Invalid section types
 * - Duplicate displayOrders
 * - Malformed metadata objects
 */
export function validateQuotationSections(quotation: any): ValidationIssue[] {
  if (process.env.NODE_ENV !== 'development') {
    return []; // Only run in development
  }

  const issues: ValidationIssue[] = [];
  const sections = quotation.section || [];

  if (!Array.isArray(sections)) {
    issues.push({ type: 'error', message: 'Quotation sections is not an array.' });
    return issues;
  }

  // 1. Check for required sections
  const hasPricing = sections.some((s: any) => s.sectionType === 'PRICING');
  if (!hasPricing) {
    issues.push({ 
      type: 'warning', 
      message: 'Quotation is missing a PRICING section, which is typically required.' 
    });
  }

  const displayOrders = new Set<number>();
  const registryKeys = Object.keys(SECTION_REGISTRY);

  sections.forEach((section: any, index: number) => {
    const { id, sectionType, displayOrder, metadata } = section;

    // 2. Check for valid section types
    if (!sectionType) {
      issues.push({ type: 'error', message: `Section at index ${index} is missing a sectionType.`, sectionId: id });
    } else if (!registryKeys.includes(sectionType)) {
      issues.push({ type: 'error', message: `Invalid sectionType "${sectionType}" found.`, sectionId: id, sectionType });
    }

    // 3. Check for unique displayOrder
    if (displayOrder == null) {
      issues.push({ type: 'warning', message: `Section is missing displayOrder.`, sectionId: id, sectionType });
    } else if (displayOrders.has(displayOrder)) {
      issues.push({ type: 'error', message: `Duplicate displayOrder "${displayOrder}" found.`, sectionId: id, sectionType });
    } else {
      displayOrders.add(displayOrder);
    }

    // 4. Check metadata structure
    if (metadata !== null && typeof metadata !== 'undefined' && typeof metadata !== 'object') {
      issues.push({ type: 'error', message: `Metadata should be a JSON object, but found ${typeof metadata}.`, sectionId: id, sectionType });
    }
  });

  if (issues.length > 0) {
    console.groupCollapsed(`🚨 Quotation Validation Issues (ID: ${quotation.id})`);
    issues.forEach(issue => {
      if (issue.type === 'error') console.error(`[${issue.sectionType || 'UNKNOWN'}] ${issue.message}`);
      else console.warn(`[${issue.sectionType || 'UNKNOWN'}] ${issue.message}`);
    });
    console.groupEnd();
  }

  return issues;
}
