'use client';
/**
 * SupportSLASection — SUPPORT_SLA
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export interface SupportSLAData {
  supportDescription?: string;
  warranty?: string;
  responseTime?: string;
  supportHours?: string;
  escalation?: string;
  packages?: string;
  contacts?: string;
}

interface Props { data: SupportSLAData; onChange: (d: SupportSLAData) => void; readOnly?: boolean; }

export function SupportSLASection({ data, onChange, readOnly = false }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Support Description</Label>
        <Textarea value={data.supportDescription ?? ''} readOnly={readOnly} rows={3}
          placeholder="Describe the support offering…" className="resize-y"
          onChange={(e) => onChange({ ...data, supportDescription: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Warranty Period</Label>
          <Input value={data.warranty ?? ''} readOnly={readOnly} placeholder="e.g. 12 months"
            onChange={(e) => onChange({ ...data, warranty: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Response Time SLA</Label>
          <Input value={data.responseTime ?? ''} readOnly={readOnly} placeholder="e.g. P1: 1hr, P2: 4hr"
            onChange={(e) => onChange({ ...data, responseTime: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Support Hours</Label>
          <Input value={data.supportHours ?? ''} readOnly={readOnly} placeholder="e.g. 24/7 or Mon–Fri 9am–6pm"
            onChange={(e) => onChange({ ...data, supportHours: e.target.value })} />
        </div>
      </div>

      {([
        { key: 'escalation', label: 'Escalation Process',  placeholder: 'How issues are escalated…' },
        { key: 'packages',   label: 'Support Packages',    placeholder: 'Basic / Standard / Premium tiers…' },
        { key: 'contacts',   label: 'Support Contacts',    placeholder: 'support@company.com, +1 800…' },
      ] as Array<{ key: keyof SupportSLAData; label: string; placeholder: string }>).map(({ key, label, placeholder }) => (
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
