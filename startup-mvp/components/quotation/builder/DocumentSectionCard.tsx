'use client';

/**
 * DocumentSectionCard
 *
 * Sortable card wrapper for QuotationBuilderV4.
 * Manages collapse state internally.
 * Provides inline title editing and enable/disable toggle.
 *
 * Props expected by V4:
 *   id, sectionType, title, isEnabled, defaultCollapsed,
 *   onTitleChange, onToggleEnabled, children
 */

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  SECTION_REGISTRY,
} from '../sectionRegistry';
import {
  SectionTypeBadge,
  type SectionType,
} from './SectionTypeIcon';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DocumentSectionCardProps {
  id: string;
  sectionType: SectionType;
  title: string;
  isEnabled: boolean;
  defaultCollapsed?: boolean;
  onTitleChange: (title: string) => void;
  onToggleEnabled: (isEnabled: boolean) => void;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentSectionCard({
  id,
  sectionType,
  title,
  isEnabled,
  defaultCollapsed = false,
  onTitleChange,
  onToggleEnabled,
  onRemove,
  children,
  className,
}: DocumentSectionCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = SECTION_REGISTRY[sectionType] ?? SECTION_REGISTRY.CUSTOM;
  const Icon = config.icon;
  const bodyId = `section-body-${id}`;
  const accent = config.accentColor;

  return (
    <section
      ref={setNodeRef}
      id={id}
      style={style}
      aria-labelledby={`section-heading-${id}`}
      className={cn(
        'rounded-xl border bg-card text-card-foreground',
        'border-l-2',
        accent,
        'shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'z-50 opacity-90 shadow-lg ring-2 ring-ring',
        !isEnabled && 'opacity-50',
        className,
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3',
          collapsed && 'py-2.5',
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Section icon */}
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            config.color,
          )}
          aria-hidden="true"
        >
          <Icon className={cn('h-4.5 w-4.5', config.textColor)} />
        </span>

        {/* Type badge */}
        <SectionTypeBadge type={sectionType} showLabel />

        {/* Editable title */}
        <input
          id={`section-heading-${id}`}
          type="text"
          value={title || config.label}
          onChange={(e) => onTitleChange(e.target.value)}
          className="min-w-0 flex-1 truncate border-none bg-transparent text-base font-bold leading-snug tracking-tight outline-none focus:ring-0"
          title="Click to rename section"
        />

        {/* Enable / disable toggle */}
        <button
          type="button"
          onClick={() => onToggleEnabled(!isEnabled)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={isEnabled ? 'Disable section' : 'Enable section'}
        >
          {isEnabled ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>

        {/* Remove custom section */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Remove section"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={collapsed ? 'Expand section' : 'Collapse section'}
        >
          {collapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {!collapsed && (
        <>
          <Separator />
          <div
            id={bodyId}
            role="region"
            aria-labelledby={`section-heading-${id}`}
            className="p-6"
          >
            {children}
          </div>
        </>
      )}
    </section>
  );
}
