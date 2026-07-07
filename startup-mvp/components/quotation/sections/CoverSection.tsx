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
  /** Context variables for template replacement */
  context?: {
    clientName?: string;
    contactName?: string;
    clientCompany?: string;
    projectName?: string;
    yourCompany?: string;
    yourName?: string;
    date?: string;
    validUntil?: string;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CoverSection({ data, onChange, readOnly = false, context }: CoverSectionProps) {
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

  const replacePlaceholders = (text: string) => {
    if (!text || !context) return text;

    const clientName    = context.clientName    || context.contactName || '[Client Name]';
    const contactName   = context.contactName   || context.clientName  || '[Contact Name]';
    const clientCompany = context.clientCompany || clientName;
    const projectName   = context.projectName   || '[Project Name]';
    const yourCompany   = context.yourCompany   || '[Your Company]';
    const yourName      = context.yourName      || '[Your Name]';
    const date          = context.date          || '[Date]';
    const validUntil    = context.validUntil    || '[Expiry Date]';

    return text
      // ── [Bracket] style ──────────────────────────────────────────────────
      .replace(/\[Client Name\]/gi,   clientName)
      .replace(/\[Contact Name\]/gi,  contactName)
      .replace(/\[Client Company\]/gi, clientCompany)
      .replace(/\[Project Name\]/gi,  projectName)
      .replace(/\[Your Company\]/gi,  yourCompany)
      .replace(/\[Your Name\]/gi,     yourName)
      .replace(/\[Date\]/gi,          date)
      .replace(/\[Expiry Date\]/gi,   validUntil)
      // ── {{mustache}} style ──────────────────────────────────────────────
      .replace(/\{\{clientName\}\}/g,    clientName)
      .replace(/\{\{contactName\}\}/g,   contactName)
      .replace(/\{\{clientCompany\}\}/g, clientCompany)
      .replace(/\{\{projectName\}\}/g,   projectName)
      .replace(/\{\{yourCompany\}\}/g,   yourCompany)
      .replace(/\{\{yourName\}\}/g,      yourName)
      .replace(/\{\{date\}\}/g,          date)
      .replace(/\{\{validUntil\}\}/g,    validUntil);
  };

  const handleTemplateSelect = (value: string) => {
    const template = templates.find((t) => t.id === value);
    if (template) {
      const processedContent = replacePlaceholders(template.content);
      onChange({
        ...data,
        coverLetter: processedContent,
        ...(template.subject ? { subject: replacePlaceholders(template.subject) } : {}),
      });
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-6 text-sm">
        {data.subject && (
          <div>
            <span className="font-semibold text-[#0A2540] mb-2 block tracking-tight uppercase text-xs">Subject / Project Name</span>
            <div className="text-gray-800 text-base">{data.subject}</div>
          </div>
        )}
        
        {data.preparedBy && (
          <div>
            <span className="font-semibold text-[#0A2540] mb-2 block tracking-tight uppercase text-xs">Prepared By</span>
            <div className="text-gray-800 text-base">{data.preparedBy}</div>
          </div>
        )}
        
        {data.validUntil && (
          <div>
            <span className="font-semibold text-[#0A2540] mb-2 block tracking-tight uppercase text-xs">Valid Until</span>
            <div className="text-gray-800 text-base">{data.validUntil}</div>
          </div>
        )}

        {data.coverLetter && (
          <div>
            <span className="font-semibold text-[#0A2540] mb-2 block tracking-tight uppercase text-xs">Cover Letter</span>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {data.coverLetter}
            </div>
          </div>
        )}
      </div>
    );
  }

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
          
          {templates.length > 0 && (
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
