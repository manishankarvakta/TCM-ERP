'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface TimelineMilestone {
  id?: string;
  label?: string;
  deliverable?: string;
  duration?: string;
  startDate?: string;
}

export interface TimelineSectionProps {
  milestones: any;
  onChange: (milestones: TimelineMilestone[]) => void;
  readOnly?: boolean;
}

function newMilestone(): TimelineMilestone {
  return { id: `ms-${Date.now()}`, deliverable: '', duration: '', startDate: '' };
}

export function TimelineSection({ milestones, onChange, readOnly = false }: TimelineSectionProps) {
  // Read-only text fallback for legacy entirely text-based milestone strings:
  if (typeof milestones === 'string') {
    return (
      <div className="p-4 space-y-4 bg-muted/30 border rounded-md">
        <div className="text-sm whitespace-pre-wrap">{milestones}</div>
        {!readOnly && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onChange([{ id: `ms-${Date.now()}`, deliverable: 'Legacy Milestone', duration: '', startDate: '' }])}
          >
            Convert to Table Format
          </Button>
        )}
      </div>
    );
  }

  const safeMilestones: TimelineMilestone[] = Array.isArray(milestones) ? milestones : [];

  if (readOnly) {
    if (safeMilestones.length === 0) return null;
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm overflow-hidden">
        <h5 className="font-semibold text-[#0A2540] tracking-tight uppercase text-xs border-b border-gray-100 pb-4 mb-4">Project Timeline & Milestones</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 border-t-0">
                <th className="font-semibold text-gray-500 uppercase tracking-wider text-xs py-3 px-2 bg-gray-50/50 rounded-tl-lg">Phase / Deliverable</th>
                <th className="font-semibold text-gray-500 uppercase tracking-wider text-xs py-3 px-2 bg-gray-50/50">Duration</th>
                <th className="font-semibold text-gray-500 uppercase tracking-wider text-xs py-3 px-2 bg-gray-50/50 rounded-tr-lg">Start Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {safeMilestones.map((ms, idx) => {
                const displayDeliverable = ms.deliverable !== undefined ? ms.deliverable : (ms.label || '');
                return (
                  <tr key={ms.id || `ms-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#0A2540]">{displayDeliverable}</td>
                    <td className="py-3 px-2 text-gray-600">{ms.duration || '—'}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {ms.startDate ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {new Date(ms.startDate).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const update = (index: number, field: keyof TimelineMilestone, value: string) => {
    const updated = safeMilestones.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    onChange(updated);
  };

  const remove = (index: number) => onChange(safeMilestones.filter((_, i) => i !== index));
  const add = () => onChange([...safeMilestones, newMilestone()]);

  return (
    <div className="space-y-4">
      {safeMilestones.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          No milestones yet. Click &ldquo;Add Row&rdquo; to get started.
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Deliverable / Phase</TableHead>
                <TableHead className="w-[30%]">Duration</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeMilestones.map((ms, idx) => {
                const rowKey = ms.id || `ms-fallback-${idx}`;
                // Fallback rendering displaying 'label' locally if mapping 'deliverable' missing
                const displayDeliverable = ms.deliverable !== undefined ? ms.deliverable : (ms.label || '');

                return (
                  <TableRow key={rowKey}>
                    <TableCell>
                      <Input
                        value={displayDeliverable}
                        placeholder="e.g. Planning"
                        className="bg-transparent border-none shadow-none focus-visible:ring-1"
                        onChange={(e) => update(idx, 'deliverable', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={ms.duration ?? ''}
                        placeholder="e.g. 2 weeks"
                        className="bg-transparent border-none shadow-none focus-visible:ring-1"
                        onChange={(e) => update(idx, 'duration', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={ms.startDate ?? ''}
                        className="bg-transparent border-none shadow-none focus-visible:ring-1"
                        onChange={(e) => update(idx, 'startDate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => remove(idx)}
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <FiPlus className="mr-2 h-4 w-4" />
        Add Row
      </Button>
    </div>
  );
}
