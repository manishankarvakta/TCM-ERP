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
import { Button } from '@/components/ui/button';
import { User, Briefcase, CalendarDays, PenSquare } from 'lucide-react';

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

  if (readOnly) {
    return (
      <div className="space-y-8 bg-white p-8 rounded-none border border-gray-200">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <PenSquare className="h-4 w-4" /> Acceptance Statement
          </h4>
          <p className="text-base text-gray-800 leading-relaxed italic border-l-4 border-black pl-4 py-1">
            {data.acceptanceText ?? DEFAULT_ACCEPTANCE_TEXT}
          </p>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-16 pt-8 border-t border-gray-150">
          {/* Left Side: Techsoul Representative */}
          <div className="space-y-6">
            <div className="h-16 flex items-end">
              <span className="text-xs text-gray-400 italic">Pre-approved by Techsoul Team</span>
            </div>
            <div className="border-t border-gray-400 pt-3">
              <p className="text-sm font-bold text-black">Authorized Signature</p>
              <p className="text-xs text-gray-500 mt-1">Techsoul Representative</p>
            </div>
          </div>
          
          {/* Right Side: Client Representative */}
          <div className="space-y-6">
            <div className="h-16 flex items-end justify-start">
              {data.signatureDataUrl ? (
                <img src={data.signatureDataUrl} className="max-h-16 object-contain" alt="Client Signature" />
              ) : (
                <span className="text-xs text-gray-400 italic">Client Signature Space</span>
              )}
            </div>
            <div className="border-t border-gray-400 pt-3 space-y-3">
              <p className="text-sm font-bold text-black">Authorized Signature (Client)</p>
              <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600 mt-2">
                <div className="flex">
                  <span className="font-semibold text-gray-400 w-24">Full Name:</span>
                  <span className="text-gray-900 font-medium">{data.signatoryName || '__________________________'}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold text-gray-400 w-24">Designation:</span>
                  <span className="text-gray-900 font-medium">{data.signatoryDesignation || '__________________________'}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold text-gray-400 w-24">Date Signed:</span>
                  <span className="text-gray-900 font-medium">{data.signatureDate ? new Date(data.signatureDate).toLocaleDateString() : '__________________________'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    </div>
  );
}
