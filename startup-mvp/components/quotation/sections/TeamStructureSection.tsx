'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface TeamMember {
  id?: string;
  role?: string;
  name?: string;
  responsibility?: string;
  allocation?: string;
  experience?: string;
  rate?: string;
  bio?: string;
}

export interface TeamStructureData {
  teamMembers?: TeamMember[]; // Legacy
  members?: TeamMember[]; // New
}

interface Props { data: TeamStructureData; onChange: (d: TeamStructureData) => void; readOnly?: boolean; }

export function TeamStructureSection({ data, onChange, readOnly = false }: Props) {
  // Read-only text fallback for pure text strings:
  if (typeof data === 'string') {
    return (
      <div className="p-4 space-y-4 bg-muted/30 border rounded-md">
        <div className="text-sm whitespace-pre-wrap">{data}</div>
        {!readOnly && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onChange({ members: [{ id: `tm-${Date.now()}`, role: 'Legacy Role', responsibility: 'Legacy Responsibility' }] })}
          >
            Convert to Table Format
          </Button>
        )}
      </div>
    );
  }

  const members = data.members ?? data.teamMembers ?? [];

  if (readOnly) {
    if (members.length === 0) return null;
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm overflow-hidden">
        <h5 className="font-semibold text-[#0A2540] tracking-tight uppercase text-xs border-b border-gray-100 pb-4 mb-4">Project Team</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m, idx) => (
            <div key={m.id || `tm-${idx}`} className="flex items-start gap-4 p-4 rounded-lg border border-gray-50 bg-gray-50/30">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                {(m.name || m.role || 'M').charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h6 className="font-bold text-sm text-[#0A2540] m-0 leading-none">{m.name || 'Team Member'}</h6>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{m.role || 'Unassigned Role'}</p>
                {m.responsibility && (
                  <p className="text-xs text-gray-500 pt-1 leading-relaxed">{m.responsibility}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const addMember = () => onChange({
    ...data,
    members: [...members, { id: `tm-${Date.now()}`, role: '', responsibility: '' }],
  });

  const update = (idx: number, patch: Partial<TeamMember>) =>
    onChange({ ...data, members: members.map((m, i) => i === idx ? { ...m, ...patch } : m) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold">Team Members</Label>
        <Button type="button" variant="outline" size="sm" onClick={addMember}>
          <FiPlus className="mr-2 h-4 w-4" />
          Add Row
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          No team members added yet. Click &ldquo;Add Row&rdquo; to get started.
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Role</TableHead>
                <TableHead className="w-[30%]">Name (Optional)</TableHead>
                <TableHead className="w-[40%]">Responsibility</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m, idx) => (
                <TableRow key={m.id || `tm-fallback-${idx}`}>
                  <TableCell>
                    <Input
                      value={m.role ?? ''}
                      placeholder="e.g. Project Manager"
                      className="bg-transparent border-none shadow-none focus-visible:ring-1"
                      onChange={(e) => update(idx, { role: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={m.name ?? ''}
                      placeholder="e.g. Alice Smith"
                      className="bg-transparent border-none shadow-none focus-visible:ring-1"
                      onChange={(e) => update(idx, { name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={m.responsibility ?? ''}
                      placeholder="e.g. Project coordination"
                      className="bg-transparent border-none shadow-none focus-visible:ring-1"
                      onChange={(e) => update(idx, { responsibility: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => onChange({ ...data, members: members.filter((_, i) => i !== idx) })}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
