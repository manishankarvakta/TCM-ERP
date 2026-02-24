'use client';

/**
 * QuotationHeaderBar — Premium sticky identity header.
 *
 * Two-row layout:
 *   Row 1: Quotation number · Status pill · Mode selector · Save button
 *   Row 2: Client / Org / Date metadata with subtle icons
 *
 * Glassmorphic card with gradient top-accent and micro-animations.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Save,
  FileText,
  Building2,
  User,
  CalendarDays,
  Hash,
  Loader2,
  Sparkles,
  Layout,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuotationMode = 'CUSTOM' | 'STANDARD' | 'TEMPLATE';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'REVISION';

// ── Status pill styles ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<QuotationStatus, { bg: string; text: string; dot: string; ring: string }> = {
  DRAFT: {
    bg:   'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-300',
    dot:  'bg-amber-500',
    ring: 'ring-amber-200 dark:ring-amber-800/50',
  },
  SENT: {
    bg:   'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-700 dark:text-blue-300',
    dot:  'bg-blue-500',
    ring: 'ring-blue-200 dark:ring-blue-800/50',
  },
  APPROVED: {
    bg:   'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot:  'bg-emerald-500',
    ring: 'ring-emerald-200 dark:ring-emerald-800/50',
  },
  REJECTED: {
    bg:   'bg-red-50 dark:bg-red-950/50',
    text: 'text-red-700 dark:text-red-300',
    dot:  'bg-red-500',
    ring: 'ring-red-200 dark:ring-red-800/50',
  },
  REVISION: {
    bg:   'bg-orange-50 dark:bg-orange-950/50',
    text: 'text-orange-700 dark:text-orange-300',
    dot:  'bg-orange-500',
    ring: 'ring-orange-200 dark:ring-orange-800/50',
  },
};

// ── Mode icon map ────────────────────────────────────────────────────────────

const MODE_ICON: Record<QuotationMode, typeof Sparkles> = {
  CUSTOM:   Wand2,
  STANDARD: Layout,
  TEMPLATE: Sparkles,
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface QuotationHeaderBarProps {
  quotationNumber: string;
  clientName: string;
  organizationName: string;
  date: string;
  status: QuotationStatus;
  onStatusChange: (s: QuotationStatus) => void;
  mode: QuotationMode;
  onModeChange: (m: QuotationMode) => void;
  onSave: () => void;
  isSaving: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuotationHeaderBar({
  quotationNumber,
  clientName,
  organizationName,
  date,
  status,
  onStatusChange,
  mode,
  onModeChange,
  onSave,
  isSaving,
}: QuotationHeaderBarProps) {
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const ModeIcon = MODE_ICON[mode] ?? Wand2;

  return (
    <div
      className={cn(
        'sticky top-0 z-30 mb-5',
        // Glassmorphic card
        'rounded-2xl border border-border/60',
        'bg-card/80 backdrop-blur-xl',
        'shadow-lg shadow-black/[0.04] dark:shadow-black/20',
        // Subtle gradient top-accent
        'overflow-hidden',
      )}
    >
      {/* ── Gradient accent line at the top ──────────────────────────────── */}
      <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

      {/* ── Row 1: Primary info ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-5 pt-3.5 pb-2">
        {/* Quotation number with icon */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <FileText className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Quotation
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">
              {quotationNumber || 'New Quotation'}
            </span>
          </div>
        </div>

        {/* Vertical divider */}
        <span className="hidden h-8 w-px bg-border/60 sm:block" />

        {/* Status pill */}
        <button
          type="button"
          onClick={() => {
            const states: QuotationStatus[] = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'REVISION'];
            const idx = states.indexOf(status);
            onStatusChange(states[(idx + 1) % states.length]);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
            'text-xs font-semibold ring-1 ring-inset',
            'transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]',
            statusStyle.bg,
            statusStyle.text,
            statusStyle.ring,
          )}
          title="Click to cycle status"
        >
          {/* Animated pulse dot */}
          <span className="relative flex h-2 w-2">
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', statusStyle.dot)} />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusStyle.dot)} />
          </span>
          {status}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Mode selector */}
        <Select value={mode} onValueChange={(v) => onModeChange(v as QuotationMode)}>
          <SelectTrigger
            className={cn(
              'h-9 w-32 gap-1.5 rounded-lg border-border/50',
              'bg-muted/40 text-xs font-medium',
              'transition-colors hover:bg-muted/70',
            )}
          >
            <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CUSTOM">
              <span className="flex items-center gap-2"><Wand2 className="h-3.5 w-3.5" /> Custom</span>
            </SelectItem>
            <SelectItem value="STANDARD">
              <span className="flex items-center gap-2"><Layout className="h-3.5 w-3.5" /> Standard</span>
            </SelectItem>
            <SelectItem value="TEMPLATE">
              <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Template</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Save button */}
        <Button
          type="button"
          size="sm"
          className={cn(
            'gap-1.5 rounded-lg px-4 font-medium',
            'bg-gradient-to-r from-primary to-primary/90',
            'shadow-sm shadow-primary/20',
            'transition-all duration-200 hover:shadow-md hover:shadow-primary/30 hover:brightness-110',
            'active:scale-[0.97]',
          )}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving…' : 'Save Draft'}
        </Button>
      </div>

      {/* ── Row 2: Metadata strip ────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-4 px-5 pb-3 pt-1',
          'text-[12px] text-muted-foreground',
        )}
      >
        {organizationName && (
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-medium text-foreground/80">{organizationName}</span>
          </span>
        )}

        {clientName && (
          <>
            {organizationName && <span className="text-muted-foreground/30">•</span>}
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground/60" />
              {clientName}
            </span>
          </>
        )}

        {date && (
          <>
            <span className="text-muted-foreground/30">•</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="tabular-nums">{date}</span>
            </span>
          </>
        )}

        {quotationNumber && (
          <>
            <span className="text-muted-foreground/30">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="tabular-nums">{quotationNumber}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
