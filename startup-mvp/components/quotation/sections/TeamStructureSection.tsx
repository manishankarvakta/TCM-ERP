'use client';
/**
 * TeamStructureSection — TEAM_STRUCTURE
 * Stores team members in section.metadata.teamStructure
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export interface TeamMember {
  id: string;
  role: string;
  name?: string;
  responsibility?: string;
  allocation?: string;
  experience?: string;
  rate?: string;
  bio?: string;
}

export interface TeamStructureData {
  teamMembers?: TeamMember[];
}

interface Props { data: TeamStructureData; onChange: (d: TeamStructureData) => void; readOnly?: boolean; }

export function TeamStructureSection({ data, onChange, readOnly = false }: Props) {
  const members = data.teamMembers ?? [];

  const addMember = () => onChange({
    ...data,
    teamMembers: [...members, { id: `tm-${Date.now()}`, role: '', name: '', responsibility: '', allocation: '', experience: '', rate: '', bio: '' }],
  });

  const update = (idx: number, patch: Partial<TeamMember>) =>
    onChange({ ...data, teamMembers: members.map((m, i) => i === idx ? { ...m, ...patch } : m) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold">Team Members</Label>
        {!readOnly && <Button type="button" variant="outline" size="sm" onClick={addMember}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Member</Button>}
      </div>

      {members.map((m, idx) => (
        <div key={m.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Input value={m.role} readOnly={readOnly} placeholder="Lead Developer"
                  onChange={(e) => update(idx, { role: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={m.name ?? ''} readOnly={readOnly} placeholder="John Smith"
                  onChange={(e) => update(idx, { name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Allocation</Label>
                <Input value={m.allocation ?? ''} readOnly={readOnly} placeholder="100% / 40hrs/wk"
                  onChange={(e) => update(idx, { allocation: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Experience</Label>
                <Input value={m.experience ?? ''} readOnly={readOnly} placeholder="8 years"
                  onChange={(e) => update(idx, { experience: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Rate</Label>
                <Input value={m.rate ?? ''} readOnly={readOnly} placeholder="$120/hr"
                  onChange={(e) => update(idx, { rate: e.target.value })} />
              </div>
            </div>
            {!readOnly && (
              <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0 mt-1"
                onClick={() => onChange({ ...data, teamMembers: members.filter((_, i) => i !== idx) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Responsibility</Label>
            <Textarea value={m.responsibility ?? ''} readOnly={readOnly} rows={2} placeholder="What this person will do…"
              className="resize-none text-sm" onChange={(e) => update(idx, { responsibility: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bio / Profile</Label>
            <Textarea value={m.bio ?? ''} readOnly={readOnly} rows={2} placeholder="Short bio…"
              className="resize-none text-sm" onChange={(e) => update(idx, { bio: e.target.value })} />
          </div>
        </div>
      ))}
      {members.length === 0 && !readOnly && (
        <p className="text-sm text-muted-foreground text-center py-4">No team members added yet.</p>
      )}
    </div>
  );
}
