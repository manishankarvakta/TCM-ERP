'use client';

/**
 * TemplateToggleButton
 * Lets users tag/untag a quotation as a reusable template.
 * Appears in the quotation detail page header.
 */

import React, { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleQuotationTemplate } from '@/app/actions/quotations';
import { toast } from 'sonner';

interface TemplateToggleButtonProps {
  quotationId: string;
  isTemplate: boolean;
}

export function TemplateToggleButton({ quotationId, isTemplate: initial }: TemplateToggleButtonProps) {
  const [isTemplate, setIsTemplate] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const next = !isTemplate;
      const result = await toggleQuotationTemplate(quotationId, next);
      if (result.success) {
        setIsTemplate(next);
        toast.success(next ? 'Saved as template' : 'Removed from templates');
      } else {
        toast.error(result.error || 'Failed to update template status');
      }
    });
  };

  return (
    <Button
      type="button"
      variant={isTemplate ? 'default' : 'outline'}
      size="sm"
      className={cn(
        'gap-1.5 transition-all',
        isTemplate
          ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700'
          : 'hover:border-purple-400 hover:text-purple-600',
      )}
      onClick={handleToggle}
      disabled={isPending}
    >
      <Sparkles className={cn('h-4 w-4', isTemplate && 'fill-white')} />
      {isPending ? 'Updating…' : isTemplate ? 'Template' : 'Save as Template'}
    </Button>
  );
}
