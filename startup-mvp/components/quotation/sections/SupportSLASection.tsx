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
  if (readOnly) {
    const hasData = Object.values(data).some(v => !!v);
    if (!hasData) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm text-sm space-y-6">
        {data.supportDescription && (
          <div className="space-y-2">
            <span className="font-semibold text-[#0A2540] tracking-tight uppercase text-xs border-b border-gray-100 pb-2 block">Support Overview</span>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-blue-500">
              {data.supportDescription}
            </div>
          </div>
        )}

        {/* SLA Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-lg border border-gray-100/50">
          {data.warranty && (
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Warranty</span>
              <span className="text-sm text-[#0A2540] font-medium">{data.warranty}</span>
            </div>
          )}
          {data.responseTime && (
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Response Target</span>
              <span className="text-sm text-[#0A2540] font-medium">{data.responseTime}</span>
            </div>
          )}
          {data.supportHours && (
            <div className="col-span-2 md:col-span-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Coverage Hours</span>
              <span className="text-sm text-[#0A2540] font-medium">{data.supportHours}</span>
            </div>
          )}
        </div>

        {/* Detailed Processes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {([
            { key: 'escalation', label: 'Escalation Process' },
            { key: 'packages',   label: 'Support Packages' },
            { key: 'contacts',   label: 'Support Contacts' },
          ] as Array<{ key: keyof SupportSLAData; label: string }>).map(({ key, label }) => {
            if (!data[key]) return null;
            return (
              <div key={key} className="space-y-2">
                <span className="font-semibold text-gray-700 tracking-tight text-xs flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
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
        <Label className="text-sm font-medium">Support Description</Label>
        <Textarea value={data.supportDescription ?? ''} rows={3}
          placeholder="Describe the support offering…" className="resize-y"
          onChange={(e) => onChange({ ...data, supportDescription: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Warranty Period</Label>
          <Input value={data.warranty ?? ''} placeholder="e.g. 12 months"
            onChange={(e) => onChange({ ...data, warranty: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Response Time SLA</Label>
          <Input value={data.responseTime ?? ''} placeholder="e.g. P1: 1hr, P2: 4hr"
            onChange={(e) => onChange({ ...data, responseTime: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Support Hours</Label>
          <Input value={data.supportHours ?? ''} placeholder="e.g. 24/7 or Mon–Fri 9am–6pm"
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
          <Textarea value={(data[key] as string) ?? ''} rows={2}
            placeholder={placeholder} className="resize-none text-sm"
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
