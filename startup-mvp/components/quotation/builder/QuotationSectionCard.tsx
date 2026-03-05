'use client';

/**
 * QuotationSectionCard
 *
 * Visual shell for a single quotation section.
 * Provides clear boundaries, section identity, and collapse behaviour.
 *
 * Deliberately NO drag-and-drop — pure presentational card.
 *
 * Structure:
 *   ┌─ Card ────────────────────────────────────────────────────────┐
 *   │  ┌─ Header ────────────────────────────────────────────────┐  │
 *   │  │  [Icon] [Type badge]  [Title]          [Collapse btn]   │  │
 *   │  └─────────────────────────────────────────────────────────┘  │
 *   │  ─── divider ─────────────────────────────────────────────    │
 *   │  ┌─ Body (conditionally rendered) ────────────────────────┐  │
 *   │  │  {children}                                             │  │
 *   │  └─────────────────────────────────────────────────────────┘  │
 *   └───────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
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

export interface QuotationSectionCardProps {
  /** Unique identifier for the section (used for aria attributes). */
  id: string;

  /** User-visible section title. */
  title: string;

  /** Section category — drives the icon and badge colour. */
  sectionType: SectionType;

  /** When true, the body is hidden and only the header is visible. */
  isCollapsed: boolean;

  /** Called when the user clicks the collapse / expand button. */
  onToggleCollapse: () => void;

  /** When true, a green check icon is shown to signal the section is complete. */
  isComplete?: boolean;

  /** Content to render inside the card body. */
  children: React.ReactNode;

  /** Optional extra CSS applied to the outer card element. */
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuotationSectionCard({
  id,
  title,
  sectionType,
  isCollapsed,
  onToggleCollapse,
  isComplete = false,
  children,
  className,
}: QuotationSectionCardProps) {
  const config = SECTION_REGISTRY[sectionType] ?? SECTION_REGISTRY.CUSTOM;
  const Icon = config.icon;
  const bodyId = `section-body-${id}`;

  return (
    <section
      aria-labelledby={`section-heading-${id}`}
      className={cn(
        // Card chrome
        'rounded-xl border bg-card text-card-foreground',
        // Accent left border (2 px)
        'border-l-2',
        config.accentColor,
        // Subtle shadow + transition
        'shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          // Slightly tighter when collapsed so the card feels compact
          isCollapsed && 'py-2.5'
        )}
      >
        {/* Section icon — matches type colour */}
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            config.color
          )}
          aria-hidden="true"
        >
          <Icon className={cn('h-4.5 w-4.5', config.textColor)} />
        </span>

        {/* Type badge */}
        <SectionTypeBadge type={sectionType} showLabel />

        {/* Title — grows to fill remaining space */}
        <h3
          id={`section-heading-${id}`}
          className="min-w-0 flex-1 truncate text-base font-bold leading-snug tracking-tight"
          title={title}
        >
          {title || config.label}
        </h3>

        {/* Completion indicator */}
        {isComplete ? (
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400"
            aria-label="Section complete"
          />
        ) : (
          <span
            className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30"
            aria-label="Section incomplete"
          />
        )}

        {/* Collapse / Expand toggle */}
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls={bodyId}
          onClick={onToggleCollapse}
          className={cn(
            'ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          title={isCollapsed ? 'Expand section' : 'Collapse section'}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Divider + body ───────────────────────────────────────────────────── */}
      {!isCollapsed && (
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
