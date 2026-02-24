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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  SECTION_TYPE_META,
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
  children: React.ReactNode;
  className?: string;
}

// ── Accent colours — covers all 22 section types ─────────────────────────────

const ACCENT: Record<string, string> = {
  COVER:                  'border-l-blue-400   dark:border-l-blue-500',
  CLIENT_INFO:            'border-l-cyan-400   dark:border-l-cyan-500',
  PROJECT_SUMMARY:        'border-l-indigo-400 dark:border-l-indigo-500',
  SCOPE:                  'border-l-teal-400   dark:border-l-teal-500',
  TIMELINE:               'border-l-amber-400  dark:border-l-amber-500',
  PRICING:                'border-l-emerald-400 dark:border-l-emerald-500',
  PAYMENT_TERMS:          'border-l-orange-400 dark:border-l-orange-500',
  LEGAL_TERMS:            'border-l-rose-400   dark:border-l-rose-500',
  TERMS:                  'border-l-slate-400  dark:border-l-slate-500',
  ACCEPTANCE:             'border-l-purple-400 dark:border-l-purple-500',
  SUMMARY:                'border-l-indigo-400 dark:border-l-indigo-500',
  EXECUTIVE_SUMMARY:      'border-l-violet-400 dark:border-l-violet-500',
  COMPANY_OVERVIEW:       'border-l-sky-400    dark:border-l-sky-500',
  TECHNICAL_APPROACH:     'border-l-lime-400   dark:border-l-lime-500',
  ARCHITECTURE_OVERVIEW:  'border-l-fuchsia-400 dark:border-l-fuchsia-500',
  TEAM_STRUCTURE:         'border-l-pink-400   dark:border-l-pink-500',
  ASSUMPTIONS:            'border-l-yellow-400 dark:border-l-yellow-500',
  RISK_ASSESSMENT:        'border-l-red-400    dark:border-l-red-500',
  SUPPORT_SLA:            'border-l-teal-400   dark:border-l-teal-500',
  APPENDIX:               'border-l-gray-400   dark:border-l-gray-500',
  CUSTOM:                 'border-l-gray-300   dark:border-l-gray-600',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentSectionCard({
  id,
  sectionType,
  title,
  isEnabled,
  defaultCollapsed = false,
  onTitleChange,
  onToggleEnabled,
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

  const meta = SECTION_TYPE_META[sectionType] ?? SECTION_TYPE_META.CUSTOM;
  const Icon = meta.icon;
  const bodyId = `section-body-${id}`;
  const accent = ACCENT[sectionType] ?? ACCENT.CUSTOM;

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
            meta.color,
          )}
          aria-hidden="true"
        >
          <Icon className={cn('h-4.5 w-4.5', meta.textColor)} />
        </span>

        {/* Type badge */}
        <SectionTypeBadge type={sectionType} showLabel />

        {/* Editable title */}
        <input
          id={`section-heading-${id}`}
          type="text"
          value={title || meta.label}
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
