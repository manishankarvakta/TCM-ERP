'use client';
/**
 * RiskAssessmentSection — RISK_ASSESSMENT
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

export interface RiskRow {
  id: string;
  risk: string;
  probability: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  mitigation: string;
  owner?: string;
}

export interface RiskAssessmentData {
  risks?: RiskRow[];
}

interface Props { data: RiskAssessmentData; onChange: (d: RiskAssessmentData) => void; readOnly?: boolean; }

const LEVELS = ['Low', 'Medium', 'High'] as const;
const LEVEL_COLOR: Record<string, string> = {
  Low:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  High:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export function RiskAssessmentSection({ data, onChange, readOnly = false }: Props) {
  const risks = data.risks ?? [];

  const addRisk = () => onChange({
    ...data,
    risks: [...risks, { id: `r-${Date.now()}`, risk: '', probability: 'Medium', impact: 'Medium', mitigation: '', owner: '' }],
  });

  const update = (idx: number, patch: Partial<RiskRow>) =>
    onChange({ ...data, risks: risks.map((r, i) => i === idx ? { ...r, ...patch } : r) });

  if (readOnly) {
    if (risks.length === 0) return null;
    return (
      <div className="space-y-4">
        {risks.map((r, idx) => (
          <div key={r.id || idx} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h5 className="font-bold text-[#0A2540] text-base">{idx + 1}. {r.risk || 'Unspecified Risk'}</h5>
              <div className="flex gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_COLOR[r.probability]}`}>
                  Prob: {r.probability}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_COLOR[r.impact]}`}>
                  Impact: {r.impact}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1 border-r border-gray-50 pr-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Owner</span>
                <span className="text-sm text-[#0A2540] font-medium">{r.owner || 'Unassigned'}</span>
              </div>
              <div className="col-span-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Mitigation Strategy</span>
                <p className="text-sm text-gray-600 leading-relaxed">{r.mitigation || 'No mitigation provided.'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Risks Register</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRisk}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Risk</Button>
      </div>

      {risks.map((r, idx) => (
        <div key={r.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Input value={r.risk} placeholder="Risk description"
              className="flex-1 font-medium" onChange={(e) => update(idx, { risk: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive"
              onClick={() => onChange({ ...data, risks: risks.filter((_, i) => i !== idx) })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['probability', 'impact'] as const).map((field) => (
              <div key={field} className="space-y-1 col-span-1">
                <Label className="text-xs text-muted-foreground capitalize">{field}</Label>
                <div className="flex gap-1 flex-wrap">
                  {LEVELS.map((lv) => (
                    <button key={lv} type="button"
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${r[field] === lv ? LEVEL_COLOR[lv] : 'border-muted text-muted-foreground hover:border-foreground'}`}
                      onClick={() => update(idx, { [field]: lv } as any)}>
                      {lv}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Owner</Label>
              <Input value={r.owner ?? ''} placeholder="Risk owner"
                className="h-8 text-sm" onChange={(e) => update(idx, { owner: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitigation</Label>
            <Textarea value={r.mitigation} rows={2} placeholder="How this risk will be mitigated…"
              className="resize-none text-sm" onChange={(e) => update(idx, { mitigation: e.target.value })} />
          </div>
        </div>
      ))}
      {risks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No risks added yet.</p>
      )}
    </div>
  );
}
