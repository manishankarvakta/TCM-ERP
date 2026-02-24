'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FiPlus, FiTrash2, FiMove } from 'react-icons/fi';

export interface TimelineMilestone {
  id: string;
  label: string;
  duration?: string;
  startDate?: string;
}

export interface TimelineSectionProps {
  milestones: TimelineMilestone[];
  onChange: (milestones: TimelineMilestone[]) => void;
  readOnly?: boolean;
}

function newMilestone(): TimelineMilestone {
  return { id: `ms-${Date.now()}`, label: '', duration: '', startDate: '' };
}

/**
 * Timeline section — lets users define ordered project milestones.
 */
export function TimelineSection({ milestones, onChange, readOnly = false }: TimelineSectionProps) {
  const update = (index: number, field: keyof TimelineMilestone, value: string) => {
    const updated = milestones.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    onChange(updated);
  };

  const remove = (index: number) => onChange(milestones.filter((_, i) => i !== index));

  const add = () => onChange([...milestones, newMilestone()]);

  return (
    <div className="space-y-4">
      {milestones.length === 0 && (
        <p className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          No milestones yet. Click &ldquo;Add Milestone&rdquo; to get started.
        </p>
      )}

      <ol className="space-y-3">
        {milestones.map((ms, idx) => (
          <li
            key={ms.id}
            className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3"
          >
            {/* Step number */}
            <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {idx + 1}
            </span>

            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              {/* Label */}
              <Input
                value={ms.label}
                readOnly={readOnly}
                placeholder="Milestone label"
                className="flex-1"
                onChange={(e) => update(idx, 'label', e.target.value)}
              />
              {/* Duration */}
              <Input
                value={ms.duration ?? ''}
                readOnly={readOnly}
                placeholder="Duration (e.g. 2 weeks)"
                className="w-36"
                onChange={(e) => update(idx, 'duration', e.target.value)}
              />
              {/* Start date */}
              <Input
                type="date"
                value={ms.startDate ?? ''}
                readOnly={readOnly}
                className="w-40"
                onChange={(e) => update(idx, 'startDate', e.target.value)}
              />
            </div>

            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 text-red-500 hover:text-red-700"
                onClick={() => remove(idx)}
              >
                <FiTrash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ol>

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <FiPlus className="mr-2 h-4 w-4" />
          Add Milestone
        </Button>
      )}
    </div>
  );
}
