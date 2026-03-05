import { SECTION_REGISTRY } from '../sectionRegistry';

// ── SectionType union ─────────────────────────────────────────────────────────
export type SectionType =
  // Core proposal sections
  | 'COVER'
  | 'CLIENT_INFO'
  | 'PROJECT_SUMMARY'
  | 'SCOPE'
  | 'TIMELINE'
  | 'PRICING'
  | 'LEGAL_TERMS'
  | 'ACCEPTANCE'
  // Optional library sections
  | 'EXECUTIVE_SUMMARY'
  | 'COMPANY_OVERVIEW'
  | 'TECHNICAL_APPROACH'
  | 'ARCHITECTURE_OVERVIEW'
  | 'TEAM_STRUCTURE'
  | 'ASSUMPTIONS'
  | 'RISK_ASSESSMENT'
  | 'SUPPORT_SLA'
  | 'APPENDIX'
  // Legacy (backward compat)
  | 'SUMMARY'
  | 'TERMS'
  | 'CUSTOM';

interface SectionTypeIconProps {
  type: SectionType;
  showLabel?: boolean;
  className?: string;
}

export function SectionTypeBadge({ type, showLabel = true, className = '' }: SectionTypeIconProps) {
  const config = SECTION_REGISTRY[type] ?? SECTION_REGISTRY.CUSTOM;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${config.textColor} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
