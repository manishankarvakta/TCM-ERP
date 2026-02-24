'use client';
/**
 * ArchitectureOverviewSection — ARCHITECTURE_OVERVIEW
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface ArchitectureOverviewData {
  architectureDescription?: string;
  hostingModel?: string;
  infrastructure?: string;
  integrations?: string;
  dataFlow?: string;
  diagram?: string;
}

interface Props { data: ArchitectureOverviewData; onChange: (d: ArchitectureOverviewData) => void; readOnly?: boolean; }

const FIELDS: Array<{ key: keyof ArchitectureOverviewData; label: string; placeholder: string; rows?: number }> = [
  { key: 'architectureDescription', label: 'Architecture Description', placeholder: 'Describe the overall system architecture…', rows: 4 },
  { key: 'hostingModel',            label: 'Hosting Model',            placeholder: 'Cloud (AWS/GCP/Azure), On-premise, Hybrid…' },
  { key: 'infrastructure',          label: 'Infrastructure',           placeholder: 'Kubernetes, EC2, RDS, CloudFront…' },
  { key: 'integrations',            label: 'Integrations',             placeholder: 'Third-party APIs and services…' },
  { key: 'dataFlow',                label: 'Data Flow',                placeholder: 'How data moves through the system…' },
  { key: 'diagram',                 label: 'Architecture Diagram URL', placeholder: 'https://…  (link to diagram)', rows: 1 },
];

export function ArchitectureOverviewSection({ data, onChange, readOnly = false }: Props) {
  return (
    <div className="space-y-4">
      {FIELDS.map(({ key, label, placeholder, rows = 3 }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea value={(data[key] as string) ?? ''} readOnly={readOnly} rows={rows}
            placeholder={placeholder} className={rows === 1 ? 'resize-none text-sm min-h-0 h-9 py-2' : 'resize-none text-sm'}
            onChange={(e) => onChange({ ...data, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
