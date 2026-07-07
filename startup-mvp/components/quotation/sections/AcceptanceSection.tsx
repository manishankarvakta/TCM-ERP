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
import { PenSquare, User, Briefcase, CalendarDays, FileSignature, Upload } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useRef } from 'react';

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
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        update('signatureDataUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const update = <K extends keyof AcceptanceData>(field: K, value: AcceptanceData[K]) =>
    onChange({ ...data, [field]: value });

  if (readOnly) {
    return (
      <div className="space-y-8 bg-gray-50 p-8 rounded-2xl border border-gray-100">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <PenSquare className="h-4 w-4" /> Acceptance Statement
          </h4>
          <p className="text-base text-gray-800 leading-relaxed italic border-l-4 border-blue-500 pl-4 py-1">
            {data.acceptanceText ?? DEFAULT_ACCEPTANCE_TEXT}
          </p>
        </div>
        
        <Separator className="bg-gray-200" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" /> Full Name
            </h4>
            <p className="text-base text-gray-900 font-medium">{data.signatoryName || '____________________'}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Designation / Title
            </h4>
            <p className="text-base text-gray-900">{data.signatoryDesignation || '____________________'}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Date Signed
            </h4>
            <p className="text-base text-gray-900">{data.signatureDate ? new Date(data.signatureDate).toLocaleDateString() : '____________________'}</p>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <FileSignature className="h-4 w-4" /> Signature
          </h4>
          {data.signatureDataUrl ? (
            <img src={data.signatureDataUrl} alt="Client signature" className="h-24 w-auto object-contain mix-blend-multiply" />
          ) : (
            <div className="h-24 w-64 border-b-2 border-dashed border-gray-300 mt-8"></div>
          )}
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

      <Separator />

      {/* Signature pad */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <FileSignature className="h-3.5 w-3.5 text-muted-foreground" />
          Signature
        </Label>

        {data.signatureDataUrl ? (
          <div className="relative group rounded-lg border bg-white dark:bg-white/5 p-2 w-full sm:w-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.signatureDataUrl}
              alt="Client signature"
              className="h-28 w-full object-contain mix-blend-multiply"
            />
            {!readOnly && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => update('signatureDataUrl', '')}
              >
                Clear
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full sm:w-96">
            <div className="h-32 rounded-lg border border-dashed bg-white dark:bg-zinc-900 overflow-hidden touch-none relative">
              {readOnly ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-muted/20 text-center">
                  <FileSignature className="mb-1.5 h-6 w-6 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No signature captured</p>
                </div>
              ) : (
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{ className: 'w-full h-full' }}
                  backgroundColor="transparent"
                  penColor="black"
                  onEnd={() => {
                    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
                      update('signatureDataUrl', sigCanvas.current.toDataURL('image/png'));
                    }
                  }}
                />
              )}
            </div>
            
            {!readOnly && (
              <div className="flex justify-between items-center px-1">
                <p className="text-xs text-muted-foreground">Sign in the box above or upload</p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Upload
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (sigCanvas.current) {
                        sigCanvas.current.clear();
                      }
                      update('signatureDataUrl', '');
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
