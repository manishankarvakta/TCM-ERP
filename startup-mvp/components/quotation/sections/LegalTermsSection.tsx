'use client';
/**
 * LegalTermsSection
 * Stores structured legal clauses in section.metadata.legalTerms
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface LegalTermsData {
  confidentiality?: string;
  ipOwnership?: string;
  liability?: string;
  termination?: string;
  governingLaw?: string;
  forceMajeure?: string;
  dataProtection?: string;
  disputeResolution?: string;
}

interface Props { data: LegalTermsData; onChange: (d: LegalTermsData) => void; readOnly?: boolean; }

const CLAUSES: Array<{ key: keyof LegalTermsData; label: string; placeholder: string }> = [
  { key: 'confidentiality',    label: 'Confidentiality',      placeholder: 'Both parties agree to keep all shared information confidential…' },
  { key: 'ipOwnership',        label: 'IP Ownership',         placeholder: 'All deliverables become property of the client upon full payment…' },
  { key: 'liability',          label: 'Limitation of Liability', placeholder: 'Liability capped at the total contract value…' },
  { key: 'termination',        label: 'Termination',          placeholder: 'Either party may terminate with 30 days written notice…' },
  { key: 'governingLaw',       label: 'Governing Law',        placeholder: 'This agreement is governed by the laws of…' },
  { key: 'forceMajeure',       label: 'Force Majeure',        placeholder: 'Neither party shall be liable for delays caused by…' },
  { key: 'dataProtection',     label: 'Data Protection',      placeholder: 'Data handled per GDPR / applicable privacy laws…' },
  { key: 'disputeResolution',  label: 'Dispute Resolution',   placeholder: 'Disputes shall first be resolved through mediation…' },
];

export function LegalTermsSection({ data, onChange, readOnly = false }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {CLAUSES.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`lt-${key}`} className="text-sm font-medium">{label}</Label>
          <Textarea
            id={`lt-${key}`}
            value={(data[key] as string) ?? ''}
            readOnly={readOnly}
            placeholder={placeholder}
            rows={3}
            className="resize-none text-sm"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
