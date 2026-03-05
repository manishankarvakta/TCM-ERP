'use client';
/**
 * TechnicalApproachSection — TECHNICAL_APPROACH
 */
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export interface TechnicalApproachData {
  // Legacy fields
  methodology?: string;
  lifecycle?: string;
  techStack?: string;
  tools?: string;
  qaProcess?: string;
  security?: string;
  
  // New structured fields
  languages?: string[];
  frontend?: string[];
  backend?: string[];
  database?: string[];
  server?: string[];
}

interface Props { data: TechnicalApproachData; onChange: (d: TechnicalApproachData) => void; readOnly?: boolean; }

const OPTIONS = {
  languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'PHP', 'Java', 'C#'],
  frontend: ['React', 'Next.js', 'Vue', 'Angular', 'Tailwind CSS', 'Svelte'],
  backend: ['Node.js', 'Express', 'NestJS', 'Django', 'FastAPI', 'Spring Boot', 'Laravel'],
  database: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase', 'Firebase'],
  server: ['AWS', 'Vercel', 'Google Cloud', 'DigitalOcean', 'Azure', 'Docker', 'Kubernetes']
};

export function TechnicalApproachSection({ data, onChange, readOnly = false }: Props) {
  // Legacy plain string fallback
  if (typeof data === 'string') {
    return (
      <div className="p-4 space-y-4 bg-muted/30 border rounded-md">
        <div className="text-sm border p-4 rounded bg-background whitespace-pre-wrap">{data}</div>
        {!readOnly && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onChange({ languages: [], frontend: [], backend: [], database: [], server: [] })}
          >
            Convert to Structured Stack
          </Button>
        )}
      </div>
    );
  }

  // Legacy field-based fallback
  if (data.methodology || typeof data.techStack === 'string') {
    return (
      <div className="p-4 space-y-4 bg-muted/30 border rounded-md">
        <div className="text-sm border p-4 rounded bg-background">
          <p><strong>Methodology:</strong> {data.methodology}</p>
          <p><strong>Tech Stack:</strong> {data.techStack}</p>
          <p><strong>Lifecycle:</strong> {data.lifecycle}</p>
        </div>
        {!readOnly && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onChange({ languages: [], frontend: [], backend: [], database: [], server: [] })}
          >
            Convert to Structured Stack
          </Button>
        )}
      </div>
    );
  }

  const safeData = {
    languages: data.languages || [],
    frontend: data.frontend || [],
    backend: data.backend || [],
    database: data.database || [],
    server: data.server || []
  };

  const toggleOption = (category: keyof typeof OPTIONS, option: string) => {
    if (readOnly) return;
    const current = safeData[category];
    const updated = current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option];
    
    onChange({ ...data, [category]: updated });
  };

  const categories = [
    { key: 'languages', title: 'Programming Languages' },
    { key: 'frontend', title: 'Frontend framework' },
    { key: 'backend', title: 'Backend Framework' },
    { key: 'database', title: 'Database' },
    { key: 'server', title: 'Hosting & Server' }
  ] as const;

  // Generator function
  const generateText = () => {
    const formatList = (items: string[]) => {
      if (!items.length) return '';
      if (items.length === 1) return items[0];
      return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    };

    const parts = [];
    if (safeData.frontend.length) parts.push(`${formatList(safeData.frontend)} on the frontend`);
    if (safeData.backend.length) parts.push(`${formatList(safeData.backend)} on the backend`);
    
    let text = `The system will be developed using ${safeData.languages.length ? formatList(safeData.languages) + ' with ' : ''}${parts.join(' and ')}.`;
    if (safeData.database.length) text += ` Data will be stored in ${formatList(safeData.database)}.`;
    if (safeData.server.length) text += ` The primary infrastructure will be hosted on ${formatList(safeData.server)}.`;

    return text;
  };

  if (readOnly) {
    const hasData = safeData.languages.length || safeData.frontend.length || safeData.backend.length || safeData.database.length || safeData.server.length;
    if (!hasData) return null;

    return (
      <div className="space-y-6 text-sm">
        <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
          <span className="font-semibold text-[#0A2540] mb-4 block tracking-tight uppercase text-xs">Technical Configuration</span>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {categories.map(({ key, title }) => {
              const items = safeData[key];
              if (!items.length) return null;
              return (
                <div key={key}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map(item => (
                      <span key={item} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-50/30 rounded-xl p-6 border border-blue-100/50">
          <span className="font-semibold text-blue-800 mb-2 block tracking-tight uppercase text-xs">Architecture Summary</span>
          <p className="text-gray-700 leading-relaxed">
            {generateText()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(({ key, title }) => (
          <div key={key} className="space-y-2">
            <Label className="text-sm font-semibold border-b pb-1 flex">{title}</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {OPTIONS[key].map((option) => {
                const isSelected = safeData[key].includes(option);
                return (
                  <Badge 
                    key={option} 
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${!isSelected ? 'hover:bg-muted' : ''}`}
                    onClick={() => toggleOption(key, option)}
                  >
                    {option}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-md">
        <Label className="text-sm font-semibold mb-2 block text-primary">Generated Proposal Text</Label>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {safeData.languages.length || safeData.frontend.length || safeData.backend.length || safeData.database.length || safeData.server.length 
            ? generateText() 
            : 'Select technologies above to generate project description...'}
        </p>
      </div>
    </div>
  );
}
