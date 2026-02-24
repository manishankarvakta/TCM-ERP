'use client';

/**
 * StickyTotalsBar
 *
 * Fixed bottom bar that keeps financial totals visible while the user scrolls
 * through the quotation document.
 *
 * Financial flow displayed:
 *   Subtotal  →  − Discount  →  + VAT (if included)  →  Grand Total
 *
 * Receives computed totals as props — no internal calculation.
 * Totals should be derived from QuotationFormV3 / QuotationBuilderV4 state.
 *
 * Responsive:
 *   mobile  : Grand Total + two action buttons only
 *   sm+     : Subtotal visible
 *   md+     : Discount visible
 *   lg+     : All columns visible
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  Save,
  Send,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface StickyTotalsBarProps {
  /** Sum of all item amounts before any deduction. */
  subtotal: number;

  /** Overall quotation-level discount amount (absolute value). */
  discount?: number;

  /**
   * VAT / tax rate as a percentage (e.g. 15 for 15%).
   * Pass 0 or omit to hide the VAT row.
   */
  vatRate?: number;

  /** Whether VAT is already included in item prices (shows "VAT incl." badge). */
  vatIncluded?: boolean;

  /** Shipping / delivery charges added on top. */
  shippingCharges?: number;

  /** Final amount payable. Computed by parent to avoid duplication. */
  grandTotal: number;

  // ── Actions ─────────────────────────────────────────────────────────────────

  onSaveDraft: () => void;
  onSubmit: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;

  /** Extra CSS for the root element. */
  className?: string;
}

// ── Inline total column ───────────────────────────────────────────────────────

function TotalCol({
  label,
  value,
  highlight = false,
  dimmed = false,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex shrink-0 flex-col items-end', className)}>
      <span
        className={cn(
          'text-[10px] uppercase tracking-widest',
          dimmed ? 'text-muted-foreground/60' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'font-semibold leading-tight tabular-nums',
          highlight ? 'text-xl text-primary' : 'text-sm'
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StickyTotalsBar({
  subtotal,
  discount = 0,
  vatRate = 0,
  vatIncluded = false,
  shippingCharges = 0,
  grandTotal,
  onSaveDraft,
  onSubmit,
  isSaving = false,
  isSubmitting = false,
  className,
}: StickyTotalsBarProps) {
  // Mobile expand/collapse for the breakdown row
  const [expanded, setExpanded] = useState(false);

  const vatAmount = vatIncluded ? 0 : (subtotal - discount) * (vatRate / 100);
  const showDiscount = discount > 0;
  const showVat = !vatIncluded && vatRate > 0;
  const showShipping = shippingCharges > 0;

  return (
    <div
      className={cn(
        // Fixed bottom positioning
        'fixed bottom-0 left-0 right-0 z-50',
        // Chrome
        'border-t bg-background/95 backdrop-blur-sm',
        'shadow-[0_-4px_24px_rgb(0,0,0,0.08)]',
        className
      )}
    >
      {/* ── Expandable breakdown (mobile toggle) ────────────────────────────── */}
      {expanded && (
        <div className="mx-auto max-w-screen-2xl border-b px-4 py-3 sm:hidden">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatCurrency(subtotal)}
            </dd>

            {showDiscount && (
              <>
                <dt className="text-red-600 dark:text-red-400">Discount</dt>
                <dd className="text-right font-medium tabular-nums text-red-600 dark:text-red-400">
                  −{formatCurrency(discount)}
                </dd>
              </>
            )}

            {vatIncluded && (
              <>
                <dt className="text-muted-foreground">VAT</dt>
                <dd className="text-right">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Included
                  </span>
                </dd>
              </>
            )}

            {showVat && (
              <>
                <dt className="text-muted-foreground">VAT ({vatRate}%)</dt>
                <dd className="text-right font-medium tabular-nums">
                  +{formatCurrency(vatAmount)}
                </dd>
              </>
            )}

            {showShipping && (
              <>
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="text-right font-medium tabular-nums">
                  +{formatCurrency(shippingCharges)}
                </dd>
              </>
            )}

            <dt className="font-semibold">Grand Total</dt>
            <dd className="text-right text-base font-bold text-primary tabular-nums">
              {formatCurrency(grandTotal)}
            </dd>
          </dl>
        </div>
      )}

      {/* ── Main bar ────────────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6">

        {/* Mobile: expand toggle */}
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground sm:hidden"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Hide breakdown' : 'Show breakdown'}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
          Details
        </button>

        {/* ── Financial summary columns ──────────────────────────────────── */}
        <div className="flex flex-1 items-center justify-end gap-4 overflow-x-auto">

          {/* Subtotal — hidden on xs */}
          <TotalCol
            label="Subtotal"
            value={formatCurrency(subtotal)}
            className="hidden sm:flex"
          />

          {/* Discount — hidden below md */}
          {showDiscount && (
            <>
              <Separator orientation="vertical" className="hidden h-6 md:block" />
              <TotalCol
                label="Discount"
                value={`−${formatCurrency(discount)}`}
                className="hidden md:flex text-red-600 dark:text-red-400"
                dimmed
              />
            </>
          )}

          {/* VAT — hidden below lg */}
          {vatIncluded && (
            <>
              <Separator orientation="vertical" className="hidden h-6 lg:block" />
              <div className="hidden lg:flex shrink-0 flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  VAT
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 mt-0.5">
                  Included
                </span>
              </div>
            </>
          )}

          {showVat && (
            <>
              <Separator orientation="vertical" className="hidden h-6 lg:block" />
              <TotalCol
                label={`VAT (${vatRate}%)`}
                value={`+${formatCurrency(vatAmount)}`}
                className="hidden lg:flex"
                dimmed
              />
            </>
          )}

          {/* Shipping — hidden below lg */}
          {showShipping && (
            <>
              <Separator orientation="vertical" className="hidden h-6 lg:block" />
              <TotalCol
                label="Shipping"
                value={`+${formatCurrency(shippingCharges)}`}
                className="hidden lg:flex"
                dimmed
              />
            </>
          )}

          {/* Grand Total — always visible, prominent */}
          <Separator orientation="vertical" className="h-6" />
          <TotalCol
            label="Grand Total"
            value={formatCurrency(grandTotal)}
            highlight
          />
        </div>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving || isSubmitting}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {isSaving ? 'Saving…' : 'Save Draft'}
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isSaving || isSubmitting}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
