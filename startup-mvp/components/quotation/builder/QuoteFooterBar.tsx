'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils/formatters';
import { Save, Send } from 'lucide-react';

export interface QuoteFooterBarProps {
  grandTotal: number;
  discount?: number;
  shippingCharges?: number;
  vatIncluded?: boolean;
  currency?: string;
  sectionCount: number;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

/**
 * Sticky bottom bar visible at all times.
 * Shows: section count | subtotal | discount | grand total | Save Draft | Submit
 */
export function QuoteFooterBar({
  grandTotal,
  discount = 0,
  shippingCharges = 0,
  vatIncluded = false,
  currency = 'TK',
  sectionCount,
  onSaveDraft,
  onSubmit,
  isSubmitting = false,
}: QuoteFooterBarProps) {
  const subtotal = grandTotal + discount - shippingCharges;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm shadow-[0_-2px_12px_rgb(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-2.5 sm:px-6">
        {/* Section count */}
        <span className="hidden text-xs text-muted-foreground sm:inline-block">
          {sectionCount} section{sectionCount !== 1 ? 's' : ''}
        </span>

        <Separator orientation="vertical" className="hidden h-5 sm:block" />

        {/* Financial summary */}
        <div className="flex flex-1 items-center gap-4 overflow-x-auto text-sm">
          {discount > 0 && (
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex shrink-0 flex-col items-end text-red-600 dark:text-red-400">
              <span className="text-[10px] uppercase tracking-wide">Discount</span>
              <span className="font-medium">-{formatCurrency(discount, currency)}</span>
            </div>
          )}

          {shippingCharges > 0 && (
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Shipping</span>
              <span className="font-medium">+{formatCurrency(shippingCharges, currency)}</span>
            </div>
          )}

          {vatIncluded && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              VAT incl.
            </span>
          )}

          {/* Grand total — always shown, prominent */}
          <div className="ml-auto flex shrink-0 flex-col items-end">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Grand Total</span>
            <span className="text-lg font-bold text-primary leading-tight">
              {formatCurrency(grandTotal, currency)}
            </span>
          </div>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
