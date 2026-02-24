'use client';

/**
 * TemplatePicker
 *
 * Modal dialog that lets the user pick an existing template quotation.
 * Only fetches quotations where `isTemplate = true`.
 * On pick, calls `onSelect(quotationId)` which triggers section cloning.
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Layout,
  Search,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { getTemplateQuotations } from '@/app/actions/quotations';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateEntry {
  id: string;
  quotationNumber: string;
  subject: string;
  date: string;
  mode: string;
  Client?: { id: string; name: string } | null;
  Organization?: { id: string; name: string } | null;
  _count: { Section: number };
}

export interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected quotation ID. Parent handles section cloning. */
  onSelect: (quotationId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TemplatePicker({ open, onOpenChange, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [filtered, setFiltered] = useState<TemplateEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  // Fetch templates when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getTemplateQuotations()
      .then((res) => {
        if (res.success) {
          setTemplates(res.templates as TemplateEntry[]);
          setFiltered(res.templates as TemplateEntry[]);
        } else {
          setError(res.error || 'Failed to load templates');
        }
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Filter on search change
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(templates);
      return;
    }
    setFiltered(
      templates.filter(
        (t) =>
          t.quotationNumber.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.Client?.name?.toLowerCase().includes(q) ||
          t.Organization?.name?.toLowerCase().includes(q),
      ),
    );
  }, [search, templates]);

  const handleSelect = async (id: string) => {
    setSelecting(id);
    onSelect(id);
    // Parent closes via onOpenChange after loading
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        {/* ── Header ──────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Choose a Template</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Pick a saved template to prefill sections. You can edit freely after.
              </DialogDescription>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by number, subject, client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-2">
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Layout className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {templates.length === 0
                  ? 'No templates found.'
                  : 'No templates match your search.'}
              </p>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground/70 max-w-[220px]">
                  Open an existing quotation and toggle &quot;Save as Template&quot; to add it here.
                </p>
              )}
            </div>
          )}

          {!loading &&
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!!selecting}
                onClick={() => handleSelect(t.id)}
                className={cn(
                  'w-full rounded-xl border bg-card p-4 text-left',
                  'transition-all duration-150',
                  'hover:border-primary/40 hover:bg-accent hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selecting === t.id && 'opacity-60 cursor-wait',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {t.quotationNumber}
                      </span>
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        {t._count.Section} section{t._count.Section !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {t.subject && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{t.subject}</p>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                      {t.Client?.name && <span>{t.Client.name}</span>}
                      {t.Client?.name && t.Organization?.name && <span>·</span>}
                      {t.Organization?.name && <span>{t.Organization.name}</span>}
                      {t.date && (
                        <>
                          <span>·</span>
                          <span>{new Date(t.date).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {filtered.length} template{filtered.length !== 1 ? 's' : ''} available
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
