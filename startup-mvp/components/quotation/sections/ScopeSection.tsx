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
        <Textarea value={data.overview ?? ''} readOnly={readOnly} placeholder="High-level scope description…"
          rows={3} className="resize-y"
          onChange={(e) => onChange({ ...data, overview: e.target.value })} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Deliverables</Label>
          {!readOnly && <Button type="button" variant="outline" size="sm" onClick={addDeliverable}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Deliverable</Button>}
        </div>
        {deliverables.map((d, idx) => (
          <div key={d.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input value={d.name} readOnly={readOnly} placeholder="Deliverable name"
                className="font-medium" onChange={(e) => updateDeliverable(idx, { name: e.target.value })} />
              {!readOnly && (
                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive"
                  onClick={() => onChange({ ...data, deliverables: deliverables.filter((_, i) => i !== idx) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Textarea value={d.description ?? ''} readOnly={readOnly} placeholder="Description" rows={2}
              className="resize-none text-sm" onChange={(e) => updateDeliverable(idx, { description: e.target.value })} />
            <Textarea value={d.features ?? ''} readOnly={readOnly} placeholder="Features included" rows={2}
              className="resize-none text-sm" onChange={(e) => updateDeliverable(idx, { features: e.target.value })} />
            <Textarea value={d.acceptanceCriteria ?? ''} readOnly={readOnly} placeholder="Acceptance criteria" rows={2}
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
