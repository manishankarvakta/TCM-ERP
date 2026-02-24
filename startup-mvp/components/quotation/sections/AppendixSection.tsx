'use client';
/**
 * AppendixSection — APPENDIX
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface AppendixData {
  attachments?: string;
  notes?: string;
  references?: string;
  glossary?: string;
}

interface Props { data: AppendixData; onChange: (d: AppendixData) => void; readOnly?: boolean; }

const FIELDS: Array<{ key: keyof AppendixData; label: string; placeholder: string }> = [
  { key: 'attachments', label: 'Attachments',   placeholder: 'List of attached documents or links…' },
  { key: 'notes',       label: 'Additional Notes', placeholder: 'Any supplementary information…' },
  { key: 'references',  label: 'References',    placeholder: 'Standards, documentation, case studies…' },
  { key: 'glossary',    label: 'Glossary',      placeholder: 'Term: Definition\nAnother term: Another definition…' },
];

export function AppendixSection({ data, onChange, readOnly = false }: Props) {
  return (
    <div className="space-y-4">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea value={(data[key] as string) ?? ''} readOnly={readOnly}
            placeholder={placeholder} rows={4} className="resize-y font-mono text-sm"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
