'use client';
/**
 * ScopeSection
 * Stores in section.metadata.scope
 */
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export interface Deliverable {
  id: string;
  name: string;
  description?: string;
  features?: string;
  acceptanceCriteria?: string;
}

export interface ScopeData {
  overview?: string;
  deliverables?: Deliverable[];
  inclusions?: string[];
  exclusions?: string[];
}

interface Props { data: ScopeData; onChange: (d: ScopeData) => void; readOnly?: boolean; }

function ListEditor({ items, onChange, placeholder, readOnly }: {
  items: string[]; onChange: (i: string[]) => void; placeholder: string; readOnly: boolean;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <Input value={item} readOnly={readOnly} placeholder={placeholder}
            onChange={(e) => { const n = [...items]; n[idx] = e.target.value; onChange(n); }}
            className="flex-1 text-sm" />
          {!readOnly && (
            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-destructive"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add item
        </Button>
      )}
    </div>
  );
}

export function ScopeSection({ data, onChange, readOnly = false }: Props) {
  const deliverables = data.deliverables ?? [];
  const inclusions   = data.inclusions ?? [];
  const exclusions   = data.exclusions ?? [];

  if (readOnly) {
    const hasData = data.overview || deliverables.length > 0 || inclusions.length > 0 || exclusions.length > 0;
    if (!hasData) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm text-sm space-y-8">
        {data.overview && (
          <div className="space-y-2">
            <span className="font-semibold text-[#0A2540] tracking-tight uppercase text-xs border-b border-gray-100 pb-2 block">Scope Overview</span>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-primary">
              {data.overview}
            </div>
          </div>
        )}

        {deliverables.length > 0 && (
          <div className="space-y-4">
            <span className="font-semibold text-[#0A2540] tracking-tight uppercase text-xs border-b border-gray-100 pb-2 block">Key Deliverables</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliverables.map((d, idx) => (
                <div key={d.id || idx} className="bg-white border border-gray-200 rounded-none p-5">
                  <h6 className="font-bold text-black text-sm mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs shrink-0">{idx + 1}</span>
                    {d.name || 'Unnamed Deliverable'}
                  </h6>
                  <div className="space-y-3 pl-8 text-sm text-gray-600">
                    {d.description && <p className="leading-relaxed">{d.description}</p>}
                    {d.features && (
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Features</span>
                        <p className="leading-relaxed whitespace-pre-wrap">{d.features}</p>
                      </div>
                    )}
                    {d.acceptanceCriteria && (
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Acceptance Criteria</span>
                        <p className="leading-relaxed whitespace-pre-wrap">{d.acceptanceCriteria}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(inclusions.length > 0 || exclusions.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-150">
            {inclusions.length > 0 && (
              <div className="space-y-3 bg-white p-5 rounded-none border border-gray-200">
                <span className="font-bold text-black tracking-tight flex items-center gap-2">
                  <Plus className="w-4 h-4 text-black" /> Inclusions
                </span>
                <ul className="space-y-2">
                  {inclusions.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {exclusions.length > 0 && (
              <div className="space-y-3 bg-white p-5 rounded-none border border-gray-200">
                <span className="font-bold text-black tracking-tight flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-black shrink-0 inline-block rounded-full" /> Exclusions
                </span>
                <ul className="space-y-2">
                  {exclusions.map((exc, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const addDeliverable = () => onChange({
    ...data,
    deliverables: [...deliverables, { id: `d-${Date.now()}`, name: '', description: '', features: '', acceptanceCriteria: '' }],
  });

  const updateDeliverable = (idx: number, patch: Partial<Deliverable>) => {
    const updated = deliverables.map((d, i) => i === idx ? { ...d, ...patch } : d);
    onChange({ ...data, deliverables: updated });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Scope Overview</Label>
        <Textarea value={data.overview ?? ''} placeholder="High-level scope description…"
          rows={3} className="resize-y"
          onChange={(e) => onChange({ ...data, overview: e.target.value })} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Deliverables</Label>
          <Button type="button" variant="outline" size="sm" onClick={addDeliverable}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Deliverable</Button>
        </div>
        {deliverables.map((d, idx) => (
          <div key={d.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input value={d.name} placeholder="Deliverable name"
                className="font-medium" onChange={(e) => updateDeliverable(idx, { name: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive"
                onClick={() => onChange({ ...data, deliverables: deliverables.filter((_, i) => i !== idx) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea value={d.description ?? ''} placeholder="Description" rows={2}
              className="resize-none text-sm" onChange={(e) => updateDeliverable(idx, { description: e.target.value })} />
            <Textarea value={d.features ?? ''} placeholder="Features included" rows={2}
              className="resize-none text-sm" onChange={(e) => updateDeliverable(idx, { features: e.target.value })} />
            <Textarea value={d.acceptanceCriteria ?? ''} placeholder="Acceptance criteria" rows={2}
              className="resize-none text-sm" onChange={(e) => updateDeliverable(idx, { acceptanceCriteria: e.target.value })} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Inclusions</Label>
          <ListEditor items={inclusions} onChange={(i) => onChange({ ...data, inclusions: i })}
            placeholder="What's included…" readOnly={readOnly} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-red-600 dark:text-red-400">Exclusions</Label>
          <ListEditor items={exclusions} onChange={(i) => onChange({ ...data, exclusions: i })}
            placeholder="What's NOT included…" readOnly={readOnly} />
        </div>
      </div>
    </div>
  );
}
