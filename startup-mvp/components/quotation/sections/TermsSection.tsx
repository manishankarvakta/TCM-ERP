'use client';

/**
 * TermsSection
 *
 * Full terms-of-service / terms & conditions rich text editor.
 * The `tos` value maps directly to `data.tos` in the quotation form state.
 *
 * Currently backed by a plain auto-growing <textarea>.
 * Replace the inner editor with Tiptap / BlockNote once available.
 */

import { useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollText, ClipboardPaste } from 'lucide-react';

// ── Data shape ────────────────────────────────────────────────────────────────

export interface TermsSectionData {
  tos?: string;
}

export interface TermsSectionProps {
  data: TermsSectionData;
  onChange: (data: TermsSectionData) => void;
  readOnly?: boolean;
  /**
   * Optional pre-loaded TOS templates to let the user stamp one in.
   * Array of { label, content } objects.
   */
  templates?: Array<{ label: string; content: string }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TermsSection({
  data,
  onChange,
  readOnly = false,
  templates = [],
}: TermsSectionProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [data.tos]);

  const applyTemplate = (content: string) =>
    onChange({ ...data, tos: content });

  return (
    <div className="space-y-4">
      {/* Template quick-apply (shown only when templates are provided and not readOnly) */}
      {!readOnly && templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Apply template:</span>
          {templates.map((tpl) => (
            <Button
              key={tpl.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => applyTemplate(tpl.content)}
            >
              <ClipboardPaste className="h-3 w-3" />
              {tpl.label}
            </Button>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="space-y-1.5">
        <Label
          htmlFor="terms-tos"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
          Terms &amp; Conditions
        </Label>

        <Textarea
          ref={ref}
          id="terms-tos"
          value={data.tos ?? ''}
          readOnly={readOnly}
          placeholder="Enter your standard terms and conditions…&#10;&#10;1. Payment is due within 30 days of invoice date.&#10;2. All prices are exclusive of VAT unless stated otherwise.&#10;…"
          className="min-h-[260px] resize-none overflow-hidden font-mono text-sm leading-relaxed"
          onChange={(e) => onChange({ ...data, tos: e.target.value })}
        />

        <p className="text-[11px] text-muted-foreground">
          This text is printed verbatim in the T&amp;C section of the quotation PDF.
        </p>
      </div>
    </div>
  );
}
