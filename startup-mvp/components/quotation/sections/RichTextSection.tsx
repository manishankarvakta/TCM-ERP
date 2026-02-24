'use client';

import { useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize as the user types
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Textarea
        ref={ref}
        value={content}
        placeholder={placeholder}
        readOnly={readOnly}
        className="min-h-[160px] resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
