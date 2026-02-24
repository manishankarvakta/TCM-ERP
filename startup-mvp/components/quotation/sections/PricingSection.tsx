'use client';

/**
 * PricingSection
 *
 * Document-flow wrapper around the existing QuotationItemsArea.
 * Adds a section header, optional description text, and consistent spacing.
 *
 * IMPORTANT: QuotationItemsArea internals are NOT touched.
 * All pricing logic, calculations, and state management remain unchanged.
 */

import { QuotationItemsArea } from '@/components/quotation/QuotationItemsArea';
import { DollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PricingSectionProps {
  /** Ordered array of pricing sections forwarded to QuotationItemsArea. */
  sections: any[];
  /** Called by QuotationItemsArea when pricing data changes. */
  onSectionsChange: (sections: any[]) => void;
  /** Optional description shown under the heading. */
  description?: string;
  /** When true, QuotationItemsArea receives readOnly (if it supports it). */
  readOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PricingSection({
  sections,
  onSectionsChange,
  description,
  readOnly = false,
}: PricingSectionProps) {
  return (
    <div className="space-y-0">
      {/* ── Section header ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 pb-4">
        {/* Icon accent */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <DollarSign className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
        </span>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold leading-tight">Pricing</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description ??
              'Add line items, grouped packages, or category-based pricing. Totals are calculated automatically.'}
          </p>
        </div>
      </div>

      <Separator className="mb-5" />

      {/* ── QuotationItemsArea — completely unmodified ───────────────────── */}
      <QuotationItemsArea
        sections={sections}
        onSectionsChange={onSectionsChange}
      />
    </div>
  );
}
