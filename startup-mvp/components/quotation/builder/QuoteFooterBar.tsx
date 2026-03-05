'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils/formatters';
import { Save, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SECTION_REGISTRY } from '../sectionRegistry';
import type { SectionType } from './SectionTypeIcon';

export interface QuoteFooterBarProps {
  grandTotal: number;
  discount?: number;
  shippingCharges?: number;
  vatIncluded?: boolean;
  currency?: string;
  sections: Array<{ id: string; sectionType: string; title?: string }>;
  activeSectionId: string | null;
  onSectionClick?: (id: string) => void;
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
  sections = [],
  activeSectionId = null,
  onSectionClick,
  onSaveDraft,
  onSubmit,
  isSubmitting = false,
}: QuoteFooterBarProps) {
  const subtotal = grandTotal + discount - shippingCharges;

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full lg:w-[calc(100%-16rem)] border-t bg-background/95 backdrop-blur-sm shadow-[0_-2px_12px_rgb(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-2.5 sm:px-6">
        {/* Section count */}
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-xs text-muted-foreground sm:inline-block">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </span>
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
        </div>

        {/* Process Indicator (Centered) */}
        <div 
          className="flex flex-1 items-center justify-center overflow-x-auto py-1.5" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sections.map((sec, index) => {
            const config = SECTION_REGISTRY[sec.sectionType as SectionType] || SECTION_REGISTRY.CUSTOM;
            const Icon = config.icon;
            const isActive = sec.id === activeSectionId;
            
            return (
              <div key={sec.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => onSectionClick?.(sec.id)}
                  title={sec.title || config.label}
                  className={cn(
                    "relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-300 shrink-0",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-[0_0_16px_rgba(var(--primary),0.8)] scale-125 z-10 ring-2 ring-primary/20 ring-offset-1 ring-offset-background" 
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground z-0",
                    config.color,
                    isActive ? config.textColor : ""
                  )}
                >
                  <Icon className={cn(
                    "transition-transform duration-300", 
                    isActive ? "h-4 w-4 sm:h-5 sm:w-5" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
                  )} />
                </button>
                
                {/* Connector line */}
                {index < sections.length - 1 && (
                  <div className={cn(
                    "mx-2 h-[2px] w-5 sm:w-8 transition-colors duration-300 rounded-full",
                    isActive ? "bg-primary/60" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <Separator orientation="vertical" className="hidden h-5 sm:block ml-4" />

        {/* Financial summary */}
        <div className="flex shrink-0 items-center justify-end gap-4 text-sm ml-auto">
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
            size="sm"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isSubmitting ? 'Saving…' : 'Save'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
