'use client';

import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

export interface RichTextSectionProps {
  /** The section's stored content (plain text or HTML) */
  content: string;
  /** Label shown above the editor */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Called whenever the content changes */
  onChange: (content: string) => void;
  /** Whether the field is read-only */
  readOnly?: boolean;
}

/**
 * A simple rich-text editor stub backed by a `<textarea>`.
 *
 * Replace the `<Textarea>` with a proper rich-text library (e.g. Tiptap,
 * Quill, BlockNote) once the dependency is available in the project.
 */
export function RichTextSection({
  content,
  label,
  placeholder = 'Enter content…',
  onChange,
  readOnly = false,
}: RichTextSectionProps) {

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <RichTextEditor
          value={content}
          onChange={onChange}
          placeholder={placeholder}
          className="min-h-[160px]"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
