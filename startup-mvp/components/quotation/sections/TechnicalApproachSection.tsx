'use client';
/**
 * TechnicalApproachSection — TECHNICAL_APPROACH
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface TechnicalApproachData {
  methodology?: string;
  lifecycle?: string;
  techStack?: string;
  tools?: string;
  qaProcess?: string;
  security?: string;
}

interface Props { data: TechnicalApproachData; onChange: (d: TechnicalApproachData) => void; readOnly?: boolean; }

const FIELDS: Array<{ key: keyof TechnicalApproachData; label: string; placeholder: string }> = [
  { key: 'methodology', label: 'Methodology',          placeholder: 'Agile, Scrum, Waterfall, …' },
  { key: 'lifecycle',   label: 'Development Lifecycle', placeholder: 'Discovery → Design → Dev → QA → Deploy…' },
  { key: 'techStack',   label: 'Technology Stack',      placeholder: 'React, Node.js, PostgreSQL, AWS…' },
  { key: 'tools',       label: 'Tools & Platforms',     placeholder: 'Jira, GitHub, Figma, Jenkins…' },
  { key: 'qaProcess',   label: 'QA Process',            placeholder: 'Unit tests, integration tests, UAT…' },
  { key: 'security',    label: 'Security Practices',    placeholder: 'OWASP, encryption at rest/transit…' },
];

export function TechnicalApproachSection({ data, onChange, readOnly = false }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea value={(data[key] as string) ?? ''} readOnly={readOnly} rows={3}
            placeholder={placeholder} className="resize-none text-sm"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
