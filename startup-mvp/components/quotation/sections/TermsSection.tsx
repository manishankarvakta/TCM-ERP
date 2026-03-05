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

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  ScrollText, 
  ClipboardPaste, 
  Sparkles,
  FileText,
  CreditCard,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { getQuotationTerms } from '@/app/(dashboard)/dashboard/settings/_actions/quotationTerms.action';

// ── Data shape ────────────────────────────────────────────────────────────────

export interface TermsSectionData {
  tos?: string;
  paymentTerms?: string;
  refundPolicy?: string;
  terminationPolicy?: string;
}

export interface TermsSectionProps {
  data: TermsSectionData;
  onChange: (data: TermsSectionData) => void;
  readOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TermsSection({
  data,
  onChange,
  readOnly = false,
}: TermsSectionProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const result = await getQuotationTerms(1, 100, "", "active");
      if (result.success) {
        setTemplates(result.quotationTerms);
      }
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  const handleTemplateSelect = (value: string) => {
    const template = templates.find((t) => t.id === value);
    if (template) {
      onChange({
        ...data,
        tos: template.content,
        paymentTerms: template.paymentTerms,
        refundPolicy: template.refundPolicy,
        terminationPolicy: template.terminationPolicy,
      });
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-8 text-sm">
        {data.tos && (
          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
            <span className="font-semibold text-[#0A2540] mb-4 block tracking-tight uppercase text-xs">Terms & Conditions</span>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap prose prose-sm prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: data.tos }} />
          </div>
        )}
        
        {data.paymentTerms && (
          <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
            <span className="font-semibold text-[#0A2540] mb-4 block tracking-tight uppercase text-xs">Payment Terms</span>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap prose prose-sm prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: data.paymentTerms }} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.refundPolicy && (
            <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
              <span className="font-semibold text-[#0A2540] mb-4 block tracking-tight uppercase text-xs">Refund Policy</span>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap prose prose-sm prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: data.refundPolicy }} />
            </div>
          )}

          {data.terminationPolicy && (
            <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
              <span className="font-semibold text-[#0A2540] mb-4 block tracking-tight uppercase text-xs">Termination Policy</span>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap prose prose-sm prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: data.terminationPolicy }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editor - TOS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="terms-tos" className="flex items-center gap-1.5 text-sm font-medium">
            <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
            Terms & Conditions
          </Label>
          
          {!readOnly && templates.length > 0 && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-7 w-[180px] text-[11px] bg-muted/50 border-none">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-[11px]">
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <RichTextEditor
            value={data.tos ?? ''}
            onChange={(val) => onChange({ ...data, tos: val })}
            placeholder="Enter your standard terms and conditions…"
            className="max-h-[300px] overflow-y-auto"
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Payment Terms */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          Payment Terms
        </Label>
        <div className="rounded-lg border bg-card shadow-sm">
          <RichTextEditor
            value={data.paymentTerms ?? ''}
            onChange={(val) => onChange({ ...data, paymentTerms: val })}
            placeholder="Enter payment schedule and conditions…"
            className="max-h-[250px] overflow-y-auto"
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Refund Policy */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            Refund Policy
          </Label>
          <div className="rounded-lg border bg-card shadow-sm">
            <RichTextEditor
              value={data.refundPolicy ?? ''}
              onChange={(val) => onChange({ ...data, refundPolicy: val })}
              placeholder="Enter refund policy…"
              className="max-h-[200px] overflow-y-auto"
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Termination Policy */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Termination Policy
          </Label>
          <div className="rounded-lg border bg-card shadow-sm">
            <RichTextEditor
              value={data.terminationPolicy ?? ''}
              onChange={(val) => onChange({ ...data, terminationPolicy: val })}
              placeholder="Enter termination terms…"
              className="max-h-[200px] overflow-y-auto"
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        These terms will be printed in the legal section of the quotation PDF.
      </p>
    </div>
  );
}
