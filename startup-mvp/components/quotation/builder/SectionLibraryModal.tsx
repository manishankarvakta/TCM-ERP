'use client';
/**
 * SectionLibraryModal
 *
 * Dialog listing the 9 optional proposal sections. Clicking one calls
 * onAddSection(sectionType) so the parent can append a new blank section.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SECTION_REGISTRY } from '../sectionRegistry';
import type { SectionType } from './SectionTypeIcon';

// ── Optional sections available in the library ────────────────────────────────

interface LibraryEntry {
  sectionType: SectionType;
  defaultTitle: string;
  description: string;
}

const LIBRARY_SECTIONS: LibraryEntry[] = [
  {
    sectionType: 'EXECUTIVE_SUMMARY',
    defaultTitle: 'Executive Summary',
    description: 'High-level overview for senior stakeholders — value, ROI, strategic fit.',
  },
  {
    sectionType: 'COMPANY_OVERVIEW',
    defaultTitle: 'Company Overview',
    description: 'Who you are: services, certifications, achievements, and portfolio.',
  },
  {
    sectionType: 'TECHNICAL_APPROACH',
    defaultTitle: 'Technical Approach',
    description: 'Methodology, tech stack, QA process, and security practices.',
  },
  {
    sectionType: 'ARCHITECTURE_OVERVIEW',
    defaultTitle: 'Architecture Overview',
    description: 'System design, hosting model, infrastructure, and integrations.',
  },
  {
    sectionType: 'TIMELINE',
    defaultTitle: 'Project Timeline',
    description: 'Milestones, deliverables, and estimated completion dates.',
  },
  {
    sectionType: 'TEAM_STRUCTURE',
    defaultTitle: 'Team Structure',
    description: 'Roles, responsibilities, allocation, and experience of each team member.',
  },
  {
    sectionType: 'ASSUMPTIONS',
    defaultTitle: 'Assumptions & Dependencies',
    description: 'Assumptions, client responsibilities, constraints, and external factors.',
  },
  {
    sectionType: 'RISK_ASSESSMENT',
    defaultTitle: 'Risk Assessment',
    description: 'Risk register with probability, impact, and mitigation strategies.',
  },
  {
    sectionType: 'SUPPORT_SLA',
    defaultTitle: 'Support & SLA',
    description: 'Warranty, response times, support hours, and escalation process.',
  },
  {
    sectionType: 'APPENDIX',
    defaultTitle: 'Appendix',
    description: 'Attachments, references, glossary, and supplementary notes.',
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface SectionLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSection: (sectionType: SectionType, defaultTitle: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SectionLibraryModal({ open, onOpenChange, onAddSection }: SectionLibraryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Optional Section</DialogTitle>
          <DialogDescription>
            Choose a section to add to this proposal. All data is stored locally in the section.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          {LIBRARY_SECTIONS.map(({ sectionType, defaultTitle, description }) => {
            const config = SECTION_REGISTRY[sectionType];
            const Icon = config.icon;
            return (
              <button
                key={sectionType}
                type="button"
                onClick={() => { onAddSection(sectionType, defaultTitle); onOpenChange(false); }}
                className="w-full flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                  <Icon className={`h-4 w-4 ${config.textColor}`} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{config.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
