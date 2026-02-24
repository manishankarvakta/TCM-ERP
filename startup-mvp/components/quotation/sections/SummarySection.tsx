'use client';

/**
 * SummarySection
 *
 * Executive summary / project overview that lives after the cover page.
 *
 * Fields
 * ──────
 *  projectOverview     → free-form description of what is being delivered
 *  financialStatement  → concise financial narrative (pre-pricing summary)
 */

import { useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BarChart2, LayoutList } from 'lucide-react';

// ── Data shape ────────────────────────────────────────────────────────────────

export interface SummarySectionData {
  projectOverview?: string;
  financialStatement?: string;
}

export interface SummarySectionProps {
  data: SummarySectionData;
  onChange: (data: SummarySectionData) => void;
  readOnly?: boolean;
}

// ── Auto-resize hook ──────────────────────────────────────────────────────────

function AutoTextarea({
  value,
  onChange,
  placeholder,
  id,
  readOnly,
  minRows = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  readOnly?: boolean;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={ref}
      id={id}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      style={{ minHeight: `${minRows * 24}px` }}
      className="resize-none overflow-hidden leading-relaxed"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SummarySection({ data, onChange, readOnly = false }: SummarySectionProps) {
  const update = <K extends keyof SummarySectionData>(field: K, value: SummarySectionData[K]) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="space-y-5">
      {/* Project overview */}
      <div className="space-y-1.5">
        <Label
          htmlFor="summary-overview"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <LayoutList className="h-3.5 w-3.5 text-muted-foreground" />
          Project Overview
        </Label>
        <AutoTextarea
          id="summary-overview"
          value={data.projectOverview ?? ''}
          readOnly={readOnly}
          placeholder="Briefly describe the scope, objectives, and key deliverables of this project…"
          minRows={5}
          onChange={(v) => update('projectOverview', v)}
        />
        <p className="text-[11px] text-muted-foreground">
          Visible to the client — keep it concise and client-facing.
        </p>
      </div>

      {/* Financial statement */}
      <div className="space-y-1.5">
        <Label
          htmlFor="summary-financial"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
          Financial Statement
        </Label>
        <AutoTextarea
          id="summary-financial"
          value={data.financialStatement ?? ''}
          readOnly={readOnly}
          placeholder="Summarise the overall cost, payment structure, or value proposition…"
          minRows={4}
          onChange={(v) => update('financialStatement', v)}
        />
        <p className="text-[11px] text-muted-foreground">
          Appears before the detailed pricing table — frames the numbers in context.
        </p>
      </div>
    </div>
  );
}
