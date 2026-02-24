'use client';

/**
 * CoverSection
 *
 * Document-facing fields that appear on the quotation cover page.
 * Replaces the old CoverSection (which only had coverTitle / coverIntro).
 *
 * Fields
 * ──────
 *  subject      → quotation subject / project name
 *  coverLetter  → multi-line personalised letter / executive note
 *  preparedBy   → name of the person who prepared this quotation
 *  validUntil   → offer expiry date (maps to expiredDate in form)
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { getActiveCoverLetters } from '@/app/actions/quotation-helpers';
import { FileText, Heading1, Sparkles } from 'lucide-react';

// ── Data shape ────────────────────────────────────────────────────────────────

export interface CoverSectionData {
  subject?: string;
  coverLetter?: string;
  preparedBy?: string;
  /** ISO date string (YYYY-MM-DD) */
  validUntil?: string;
}

export interface CoverSectionProps {
  data: CoverSectionData;
  onChange: (data: CoverSectionData) => void;
  readOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CoverSection({ data, onChange, readOnly = false }: CoverSectionProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const result = await getActiveCoverLetters();
      if (result.success) {
        setTemplates(result.coverLetters);
      }
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  const update = <K extends keyof CoverSectionData>(field: K, value: CoverSectionData[K]) =>
    onChange({ ...data, [field]: value });

  const handleTemplateSelect = (value: string) => {
    const template = templates.find((t) => t.id === value);
    if (template) {
      update('coverLetter', template.content);
    }
  };

  return (
    <div className="space-y-5">
      {/* Subject / project name */}
      <div className="space-y-1.5">
        <Label htmlFor="cover-subject" className="flex items-center gap-1.5 text-sm font-medium">
          <Heading1 className="h-3.5 w-3.5 text-muted-foreground" />
          Subject
        </Label>
        <Input
          id="cover-subject"
          value={data.subject ?? ''}
          readOnly={readOnly}
          placeholder="e.g. Interior Design Proposal — Acme HQ"
          onChange={(e) => update('subject', e.target.value)}
        />
      </div>

      {/* Cover letter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="cover-letter" className="flex items-center gap-1.5 text-sm font-medium">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Cover Letter
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
        
        <Textarea
          id="cover-letter"
          value={data.coverLetter ?? ''}
          readOnly={readOnly}
          placeholder="Dear [Client Name],&#10;&#10;We are pleased to present this quotation for…"
          className="min-h-[180px] resize-none leading-relaxed"
          onChange={(e) => update('coverLetter', e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          This text will appear on the cover page of the printed quotation.
        </p>
      </div>

    </div>
  );
}
