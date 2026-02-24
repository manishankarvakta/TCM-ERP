'use client';
/**
 * CompanyOverviewSection — COMPANY_OVERVIEW
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export interface CompanyOverviewData {
  description?: string;
  yearsInBusiness?: string;
  coreServices?: string;
  certifications?: string;
  achievements?: string;
  portfolioHighlights?: string;
  clientLogos?: string;
  teamSize?: string;
}

interface Props { data: CompanyOverviewData; onChange: (d: CompanyOverviewData) => void; readOnly?: boolean; }

export function CompanyOverviewSection({ data, onChange, readOnly = false }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Company Description</Label>
        <Textarea value={data.description ?? ''} readOnly={readOnly} rows={4}
          placeholder="Who we are and what we do…" className="resize-y"
          onChange={(e) => onChange({ ...data, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Years in Business</Label>
          <Input value={data.yearsInBusiness ?? ''} readOnly={readOnly} placeholder="e.g. 12 years"
            onChange={(e) => onChange({ ...data, yearsInBusiness: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Team Size</Label>
          <Input value={data.teamSize ?? ''} readOnly={readOnly} placeholder="e.g. 45 employees"
            onChange={(e) => onChange({ ...data, teamSize: e.target.value })} />
        </div>
      </div>
      {([
        { key: 'coreServices',       label: 'Core Services',        placeholder: 'List your primary service offerings…' },
        { key: 'certifications',     label: 'Certifications',       placeholder: 'ISO 9001, AWS Partner, …' },
        { key: 'achievements',       label: 'Key Achievements',     placeholder: 'Awards, milestones, recognitions…' },
        { key: 'portfolioHighlights',label: 'Portfolio Highlights', placeholder: 'Notable past projects…' },
        { key: 'clientLogos',        label: 'Notable Clients',      placeholder: 'Client names or logo descriptions…' },
      ] as Array<{ key: keyof CompanyOverviewData; label: string; placeholder: string }>).map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea value={(data[key] as string) ?? ''} readOnly={readOnly} rows={2}
            placeholder={placeholder} className="resize-none text-sm"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
