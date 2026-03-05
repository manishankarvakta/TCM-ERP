'use client';

import React from 'react';
import { SECTION_REGISTRY } from './sectionRegistry';
import { normalizeSectionMetadata } from '@/lib/quotation/normalizeSectionMetadata';
import type { RendererSection } from './QuotationSectionRenderer';
import { SectionType } from '@/components/quotation/builder/SectionTypeIcon';
import { replaceQuotationTemplates } from '@/lib/quotation/templateReplacer';

interface SectionViewRendererProps {
  section: RendererSection;
  quotation?: any;
}

export function SectionViewRenderer({ section, quotation }: SectionViewRendererProps) {
  const sectionType = section.sectionType as SectionType;
  const config = SECTION_REGISTRY[sectionType] || SECTION_REGISTRY.CUSTOM;
  const Component = config.component;

  // Normalize metadata using the same logic as the builder
  const normalizedMetadata = normalizeSectionMetadata(sectionType, section.metadata);
  
  // Helpers for the components
  const metaData = (key: string) => {
    const data = normalizedMetadata[key] ?? {};
    if (quotation) {
      // Create a copy and dynamically replace strings
      const replacedData = { ...data };
      Object.keys(replacedData).forEach(k => {
        if (typeof replacedData[k] === 'string') {
          replacedData[k] = replaceQuotationTemplates(replacedData[k], quotation);
        }
      });
      return replacedData;
    }
    return data;
  };

  const getContent = (sec: RendererSection) => {
    let raw = sec.content ?? (sec as any).note ?? '';
    if (quotation) {
      raw = replaceQuotationTemplates(raw, quotation);
    }
    return raw;
  };

  // We pass a no-op update function since this is view-only
  const noop = () => {};

  // For PRICING sections, we might want to let the parent handle the table 
  // if it's already implemented there, but for a "Unified" approach, 
  // we could eventually move table rendering here too.
  // For now, if it's PRICING, we'll return null and let page.tsx continue 
  // rendering its own table, OR we implement a read-only table here.
  
  if (sectionType === 'PRICING') {
    // page.tsx currently handles PRICING tables manually.
    // To avoid duplication or layout shifts, we'll return null for PRICING here
    // until we are ready to refactor the table rendering.
    return null;
  }

  return (
    <div className="mt-4">
      <Component
        section={section}
        onUpdate={noop}
        readOnly={true}
        metaData={metaData}
        updateMeta={noop}
        getContent={getContent}
      />
    </div>
  );
}
