'use client';
/**
 * ExecutiveSummarySection — EXECUTIVE_SUMMARY
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export interface ExecutiveSummaryData {
  overview?: string;
  valueProposition?: string;
  strategicAlignment?: string;
  roi?: string;
  successMetrics?: string;
}

interface Props { data: ExecutiveSummaryData; onChange: (d: ExecutiveSummaryData) => void; readOnly?: boolean; }

export function ExecutiveSummarySection({ data, onChange, readOnly = false }: Props) {
  return (
    <div className="space-y-4">
      {([
        { key: 'overview',            label: 'Executive Overview',    rows: 4, placeholder: 'Brief summary for senior stakeholders…' },
        { key: 'valueProposition',    label: 'Value Proposition',     rows: 3, placeholder: 'Why this proposal offers the best value…' },
        { key: 'strategicAlignment',  label: 'Strategic Alignment',   rows: 2, placeholder: 'How this aligns with business strategy…' },
        { key: 'roi',                 label: 'Return on Investment',  rows: 2, placeholder: 'Expected ROI and payback period…' },
        { key: 'successMetrics',      label: 'Success Metrics',       rows: 2, placeholder: 'KPIs to measure project success…' },
      ] as Array<{ key: keyof ExecutiveSummaryData; label: string; rows: number; placeholder: string }>).map(({ key, label, rows, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`es-${key}`} className="text-sm font-medium">{label}</Label>
          <Textarea id={`es-${key}`} value={(data[key] as string) ?? ''} readOnly={readOnly}
            placeholder={placeholder} rows={rows} className="resize-y"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
