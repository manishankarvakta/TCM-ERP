'use client';
/**
 * AssumptionsSection — ASSUMPTIONS
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface AssumptionsData {
  assumptions?: string;
  clientResponsibilities?: string;
  dependencies?: string;
  constraints?: string;
  externalFactors?: string;
}

interface Props { data: AssumptionsData; onChange: (d: AssumptionsData) => void; readOnly?: boolean; }

const FIELDS: Array<{ key: keyof AssumptionsData; label: string; placeholder: string }> = [
  { key: 'assumptions',             label: 'Assumptions',              placeholder: 'List all assumptions the proposal is based on…' },
  { key: 'clientResponsibilities',  label: 'Client Responsibilities', placeholder: 'What the client must provide or do…' },
  { key: 'dependencies',            label: 'Dependencies',             placeholder: 'External services, approvals, or data required…' },
  { key: 'constraints',             label: 'Constraints',              placeholder: 'Technical, legal, or resource constraints…' },
  { key: 'externalFactors',         label: 'External Factors',         placeholder: 'Market conditions, regulatory changes, etc.' },
];

export function AssumptionsSection({ data, onChange, readOnly = false }: Props) {
  if (readOnly) {
    const hasData = FIELDS.some(({ key }) => !!data[key]);
    if (!hasData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-xl border border-gray-100 p-6 shadow-sm text-sm">
        {FIELDS.map(({ key, label }) => {
          const value = data[key] as string;
          if (!value) return null;
          return (
            <div key={key} className="space-y-2">
              <span className="font-semibold text-[#0A2540] tracking-tight uppercase text-xs border-b border-gray-100 pb-2 block flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                {label}
              </span>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-gray-50">
                {value}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea value={(data[key] as string) ?? ''}
            placeholder={placeholder} rows={3} className="resize-y"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
