'use client';

/**
 * ProjectSummarySection
 * Stores in section.metadata.projectSummary
 */
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

export interface ProjectSummaryData {
  content?: string;
}

interface Props { 
  data?: ProjectSummaryData; 
  onChange: (d: ProjectSummaryData) => void; 
  readOnly?: boolean; 
}

export function ProjectSummarySection({ data, onChange, readOnly = false }: Props) {
  const content = data?.content ?? '';

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-500 uppercase tracking-wider block mb-4">Project Summary</Label>
          <div className="prose prose-sm max-w-none text-gray-700 bg-white p-6 rounded-xl border border-gray-100" dangerouslySetInnerHTML={{ __html: content || 'No summary provided.' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Project Summary</Label>
        <div className="min-h-[220px] max-h-[300px] overflow-y-auto rounded-md border border-input bg-background relative">
          <RichTextEditor
            value={content}
            onChange={(html) => onChange({ ...(data || {}), content: html })}
          />
        </div>
      </div>
    </div>
  );
}
