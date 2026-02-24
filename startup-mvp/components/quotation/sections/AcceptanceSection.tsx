'use client';

/**
 * AcceptanceSection
 *
 * Signature / acceptance block at the end of the quotation.
 *
 * Fields
 * ──────
 *  acceptanceText       → editable statement the client countersigns
 *  signatoryName        → authorised signatory's full name
 *  signatoryDesignation → job title / role
 *  signatureDate        → date signed
 *  signatureDataUrl     → base64 PNG from a future signature-pad integration
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PenSquare, User, Briefcase, CalendarDays, FileSignature } from 'lucide-react';

// ── Data shape ────────────────────────────────────────────────────────────────

export interface AcceptanceData {
  /** Paragraph the client is agreeing to. */
  acceptanceText?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatureDate?: string;
  /** base64 PNG — integrate react-signature-canvas against this field. */
  signatureDataUrl?: string;
}

export interface AcceptanceSectionProps {
  data: AcceptanceData;
  onChange: (data: AcceptanceData) => void;
  readOnly?: boolean;
}

const DEFAULT_ACCEPTANCE_TEXT =
  'By signing below, I/we confirm that I/we have read, understood, and agree to the scope, pricing, and terms set out in this quotation. This acceptance constitutes a binding order upon the issuing party.';

// ── Component ─────────────────────────────────────────────────────────────────

export function AcceptanceSection({
  data,
  onChange,
  readOnly = false,
}: AcceptanceSectionProps) {
  const update = <K extends keyof AcceptanceData>(field: K, value: AcceptanceData[K]) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      {/* Acceptance statement — editable so firms can customise the wording */}
      <div className="space-y-1.5">
        <Label
          htmlFor="acceptance-text"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <PenSquare className="h-3.5 w-3.5 text-muted-foreground" />
          Acceptance Statement
        </Label>
        <Textarea
          id="acceptance-text"
          value={data.acceptanceText ?? DEFAULT_ACCEPTANCE_TEXT}
          readOnly={readOnly}
          placeholder={DEFAULT_ACCEPTANCE_TEXT}
          className="min-h-[100px] resize-none leading-relaxed text-sm"
          onChange={(e) => update('acceptanceText', e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          This paragraph appears above the signature area on the printed quotation.
        </p>
      </div>

      <Separator />

      {/* Signatory details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Full name */}
        <div className="space-y-1.5">
          <Label
            htmlFor="signatory-name"
            className="flex items-center gap-1.5 text-sm font-medium"
          >
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Full Name
          </Label>
          <Input
            id="signatory-name"
            value={data.signatoryName ?? ''}
            readOnly={readOnly}
            placeholder="Authorised signatory name"
            onChange={(e) => update('signatoryName', e.target.value)}
          />
        </div>

        {/* Designation */}
        <div className="space-y-1.5">
          <Label
            htmlFor="signatory-designation"
            className="flex items-center gap-1.5 text-sm font-medium"
          >
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            Designation / Title
          </Label>
          <Input
            id="signatory-designation"
            value={data.signatoryDesignation ?? ''}
            readOnly={readOnly}
            placeholder="e.g. Managing Director"
            onChange={(e) => update('signatoryDesignation', e.target.value)}
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label
            htmlFor="signature-date"
            className="flex items-center gap-1.5 text-sm font-medium"
          >
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            Date Signed
          </Label>
          <Input
            id="signature-date"
            type="date"
            value={data.signatureDate ?? ''}
            readOnly={readOnly}
            onChange={(e) => update('signatureDate', e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Signature pad */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <FileSignature className="h-3.5 w-3.5 text-muted-foreground" />
          Signature
        </Label>

        {data.signatureDataUrl ? (
          // Render captured signature
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.signatureDataUrl}
            alt="Client signature"
            className="h-28 w-full rounded-lg border object-contain bg-white dark:bg-white/5"
          />
        ) : (
          <div
            className={[
              'flex h-28 w-full flex-col items-center justify-center',
              'rounded-lg border border-dashed bg-muted/20 text-center',
            ].join(' ')}
          >
            <FileSignature className="mb-1.5 h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              {readOnly
                ? 'No signature captured'
                : 'Signature pad — integrate react-signature-canvas here'}
            </p>
            {!readOnly && (
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                Set <code className="font-mono">signatureDataUrl</code> to a base64 PNG to display a captured signature.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
