'use client';
/**
 * PaymentTermsSection
 * Rich metadata form for PAYMENT_TERMS section.
 * Stores in section.metadata.paymentTerms
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

export interface PaymentScheduleRow {
  id: string;
  milestone: string;
  percentage: string;
  amount: string;
  dueDate: string;
}

export interface PaymentTermsData {
  paymentSchedule?: PaymentScheduleRow[];
  paymentMethods?: string;
  bankDetails?: string;
  latePenalty?: string;
  invoiceTerms?: string;
  refundPolicy?: string;
}

interface Props { data: PaymentTermsData; onChange: (d: PaymentTermsData) => void; readOnly?: boolean; }

export function PaymentTermsSection({ data, onChange, readOnly = false }: Props) {
  const schedule = data.paymentSchedule ?? [];

  const addRow = () => onChange({
    ...data,
    paymentSchedule: [...schedule, { id: `pt-${Date.now()}`, milestone: '', percentage: '', amount: '', dueDate: '' }],
  });

  const updateRow = (idx: number, patch: Partial<PaymentScheduleRow>) =>
    onChange({ ...data, paymentSchedule: schedule.map((r, i) => i === idx ? { ...r, ...patch } : r) });

  const removeRow = (idx: number) =>
    onChange({ ...data, paymentSchedule: schedule.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-6">
      {/* Schedule table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Payment Schedule</Label>
          {!readOnly && <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Row</Button>}
        </div>
        {schedule.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {['Milestone', '% Share', 'Amount', 'Due Date', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-foreground text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, idx) => (
                  <tr key={row.id} className="odd:bg-background even:bg-muted/20 hover:bg-accent/30 transition-colors">
                    <td className="px-2 py-1"><Input value={row.milestone} readOnly={readOnly} placeholder="Milestone" className="h-8 text-xs border-0 bg-transparent" onChange={(e) => updateRow(idx, { milestone: e.target.value })} /></td>
                    <td className="px-2 py-1"><Input value={row.percentage} readOnly={readOnly} placeholder="30%" className="h-8 text-xs border-0 bg-transparent w-20" onChange={(e) => updateRow(idx, { percentage: e.target.value })} /></td>
                    <td className="px-2 py-1"><Input value={row.amount} readOnly={readOnly} placeholder="$5,000" className="h-8 text-xs border-0 bg-transparent w-28" onChange={(e) => updateRow(idx, { amount: e.target.value })} /></td>
                    <td className="px-2 py-1"><Input type="date" value={row.dueDate} readOnly={readOnly} className="h-8 text-xs border-0 bg-transparent" onChange={(e) => updateRow(idx, { dueDate: e.target.value })} /></td>
                    <td className="px-2 py-1">
                      {!readOnly && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Text fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          { key: 'paymentMethods', label: 'Payment Methods', placeholder: 'Bank transfer, credit card…' },
          { key: 'latePenalty',    label: 'Late Payment Penalty', placeholder: '1.5% per month after 30 days' },
          { key: 'invoiceTerms',   label: 'Invoice Terms', placeholder: 'Net 30' },
          { key: 'refundPolicy',   label: 'Refund Policy', placeholder: 'Non-refundable after milestone sign-off' },
        ] as Array<{ key: keyof PaymentTermsData; label: string; placeholder: string }>).map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-sm font-medium">{label}</Label>
            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
              <RichTextEditor
                value={(data[key] as string) ?? ''}
                onChange={(val) => onChange({ ...data, [key]: val })}
                placeholder={placeholder}
                className="min-h-[80px]"
                readOnly={readOnly}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Bank Details</Label>
        <div className="rounded-md border bg-card shadow-sm overflow-hidden">
          <RichTextEditor
            value={data.bankDetails ?? ''}
            onChange={(val) => onChange({ ...data, bankDetails: val })}
            placeholder="Bank name, account number, IBAN, SWIFT…"
            className="min-h-[100px]"
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
