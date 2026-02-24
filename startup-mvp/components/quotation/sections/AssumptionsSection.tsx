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
  return (
    <div className="space-y-4">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea value={(data[key] as string) ?? ''} readOnly={readOnly}
            placeholder={placeholder} rows={3} className="resize-y"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
