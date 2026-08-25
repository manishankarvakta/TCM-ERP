'use client';
/**
 * ClientInfoSection
 * Stores company/contact details in section.metadata.clientInfo
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ClientInfoData {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
}

interface Props { 
  data: ClientInfoData; 
  onChange: (d: ClientInfoData) => void; 
  readOnly?: boolean;
  contacts?: any[];
}

export function ClientInfoSection({ data, onChange, readOnly = false, contacts = [] }: Props) {
  const set = <K extends keyof ClientInfoData>(k: K, v: ClientInfoData[K]) =>
    onChange({ ...data, [k]: v });

  // Handle specialized contact selection to auto-apply email/phone updates
  const handleContactSelect = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    onChange({
      ...data,
      contactPerson: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email || data.email,
      phone: contact.phone || data.phone,
    });
  };

  const fields: Array<{ key: keyof ClientInfoData; label: string; placeholder: string; type?: string; multi?: boolean }> = [
    { key: 'companyName',     label: 'Company Name',      placeholder: 'Acme Corp' },
    // contactPerson is handled separately below due to custom render logic
    { key: 'email',           label: 'Email',             placeholder: 'jane@example.com', type: 'email' },
    { key: 'phone',           label: 'Phone',             placeholder: '+1 555 000 0000', type: 'tel' },
    // industry is handled separately at full width
  ];

  const industries = [
    'e-Commerce & Retail',
    'FinTech & Banking',
    'Healthcare & Medical',
    'EdTech & eLearning',
    'Real Estate & PropTech',
    'Logistics & Supply Chain',
    'Travel & Hospitality',
    'SaaS & Enterprise',
    'Media & Entertainment',
    'Other'
  ];

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 py-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Company Name</h4>
            <p className="text-base text-gray-900 font-medium">{data.companyName || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Person</h4>
            <p className="text-base text-gray-900">{data.contactPerson || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</h4>
            <p className="text-base text-gray-900">{data.email || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</h4>
            <p className="text-base text-gray-900">{data.phone || 'N/A'}</p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Industry / Vertical</h4>
            <p className="text-base text-gray-900">{data.industry || 'N/A'}</p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</h4>
            <p className="text-base text-gray-900 whitespace-pre-wrap">{data.address || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Company Name (First Field) */}
        <div className="space-y-1.5">
          <Label htmlFor="ci-companyName" className="text-sm font-medium">Company Name</Label>
          <Input
            id="ci-companyName"
            type="text"
            value={(data.companyName as string) ?? ''}
            readOnly={readOnly}
            placeholder="Acme Corp"
            onChange={(e) => set('companyName', e.target.value)}
          />
        </div>

        {/* Contact Person (Dropdown if contacts exist, otherwise text input) */}
        <div className="space-y-1.5">
          <Label htmlFor="ci-contactPerson" className="text-sm font-medium">Contact Person</Label>
          {contacts.length > 0 && !readOnly ? (
            <Select
              value={contacts.find(c => `${c.firstName} ${c.lastName}`.trim() === data.contactPerson)?.id || ''}
              onValueChange={handleContactSelect}
            >
              <SelectTrigger id="ci-contactPerson" className="h-9 w-full">
                <SelectValue placeholder="Select contact or type new" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {`${c.firstName} ${c.lastName}`.trim()} {c.isPrimary ? '(Primary)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="ci-contactPerson"
              type="text"
              value={(data.contactPerson as string) ?? ''}
              readOnly={readOnly}
              placeholder="Jane Doe"
              onChange={(e) => set('contactPerson', e.target.value)}
            />
          )}
        </div>

        {/* Remaining standard fields (Email, Phone) */}
        {fields.slice(1).map(({ key, label, placeholder, type }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`ci-${key}`} className="text-sm font-medium">{label}</Label>
            <Input
              id={`ci-${key}`}
              type={type ?? 'text'}
              value={(data[key] as string) ?? ''}
              readOnly={readOnly}
              placeholder={placeholder}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Industry (Full Width Select) */}
      <div className="space-y-1.5">
        <Label htmlFor="ci-industry" className="text-sm font-medium">Industry / Vertical</Label>
        {readOnly ? (
            <Input
              id="ci-industry"
              type="text"
              value={data.industry ?? ''}
              readOnly={true}
            />
        ) : (
          <Select
            value={data.industry || ''}
            onValueChange={(val) => set('industry', val)}
          >
            <SelectTrigger id="ci-industry" className="h-9 w-full">
              <SelectValue placeholder="Select industry..." />
            </SelectTrigger>
            <SelectContent>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Address (Full Width Textarea) */}
      <div className="space-y-1.5">
        <Label htmlFor="ci-address" className="text-sm font-medium">Address</Label>
        <Textarea
          id="ci-address"
          value={data.address ?? ''}
          readOnly={readOnly}
          placeholder="Full postal address"
          rows={3}
          className="resize-none"
          onChange={(e) => set('address', e.target.value)}
        />
      </div>
    </div>
  );
}
