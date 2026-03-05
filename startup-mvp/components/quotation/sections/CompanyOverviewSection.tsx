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
  if (readOnly) {
    const fields = [
      { key: 'coreServices',       label: 'Core Services' },
      { key: 'certifications',     label: 'Certifications' },
      { key: 'achievements',       label: 'Key Achievements' },
      { key: 'portfolioHighlights',label: 'Portfolio Highlights' },
      { key: 'clientLogos',        label: 'Notable Clients' },
    ] as Array<{ key: keyof CompanyOverviewData; label: string }>;

    const hasData = Object.values(data).some(v => !!v);
    if (!hasData) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm text-sm space-y-6">
        {data.description && (
          <div className="space-y-2">
            <span className="font-semibold text-[#0A2540] tracking-tight uppercase text-xs border-b border-gray-100 pb-2 block">Company Overview</span>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-indigo-500">
              {data.description}
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-lg border border-gray-100/50">
          {data.yearsInBusiness && (
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Years in Business</span>
              <span className="text-sm text-[#0A2540] font-medium">{data.yearsInBusiness}</span>
            </div>
          )}
          {data.teamSize && (
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Team Size</span>
              <span className="text-sm text-[#0A2540] font-medium">{data.teamSize}</span>
            </div>
          )}
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {fields.map(({ key, label }) => {
            if (!data[key]) return null;
            return (
              <div key={key} className="space-y-2">
                <span className="font-semibold text-gray-700 tracking-tight text-xs flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-400" />
                  {label}
                </span>
                <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">
                  {data[key]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Company Description</Label>
        <Textarea value={data.description ?? ''} rows={4}
          placeholder="Who we are and what we do…" className="resize-y"
          onChange={(e) => onChange({ ...data, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Years in Business</Label>
          <Input value={data.yearsInBusiness ?? ''} placeholder="e.g. 12 years"
            onChange={(e) => onChange({ ...data, yearsInBusiness: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Team Size</Label>
          <Input value={data.teamSize ?? ''} placeholder="e.g. 45 employees"
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
          <Textarea value={(data[key] as string) ?? ''} rows={2}
            placeholder={placeholder} className="resize-none text-sm"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
