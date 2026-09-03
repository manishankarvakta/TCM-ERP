'use client';

import { Button } from '@/components/ui/button';
import { FiEdit, FiSend, FiCheck, FiCheckCircle, FiX } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateQuotationStatus } from '@/app/actions/quotations';
import { useToast } from '@/hooks/use-toast';
import { QuotationStatus } from '@prisma/client';

interface QuotationActionButtonsProps {
  quotationId: string;
  status: QuotationStatus;
  basePath?: string; // Optional base path, defaults to '/dashboard/quotations'
  canApprove?: boolean; // Whether user has approve permission
}

export default function QuotationActionButtons({ quotationId, status, basePath = '/dashboard/quotations', canApprove = false }: QuotationActionButtonsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    startTransition(async () => {
      const result = await updateQuotationStatus(quotationId, newStatus);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Quotation status updated to ${newStatus}`,
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update quotation status',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="flex gap-2">
      {[QuotationStatus.DRAFT, QuotationStatus.REVIEW, QuotationStatus.APPROVED, QuotationStatus.SENT].includes(status as any) && (
        <Link href={`${basePath}/${quotationId}/edit`}>
          <Button variant="outline">
            <FiEdit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      )}

      {/* Approve button - visible when status is DRAFT or REVIEW */}
      {(status === 'DRAFT' || status === 'REVIEW') && canApprove && (
        <Button
          variant="default"
          onClick={() => handleStatusChange(QuotationStatus.APPROVED)}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <FiCheck className="w-4 h-4 mr-2" />
          Approve
        </Button>
      )}

      {/* Send button - visible when status is APPROVED */}
      {status === 'APPROVED' && (
        <Button
          variant="default"
          onClick={() => handleStatusChange(QuotationStatus.SENT)}
          disabled={isPending}
        >
          <FiSend className="w-4 h-4 mr-2" />
          Send
        </Button>
      )}

      {/* Accept and Reject buttons - visible when status is SENT */}
      {status === QuotationStatus.SENT && (
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => handleStatusChange(QuotationStatus.ACCEPTED)}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FiCheckCircle className="w-4 h-4 mr-1" />
            Accepted
          </Button>

          <Button
            variant="destructive"
            onClick={() => handleStatusChange(QuotationStatus.REJECTED)}
            disabled={isPending}
          >
            <FiX className="w-4 h-4 mr-1" />
            Rejected
          </Button>
        </div>
      )}

      {/* Create Agreement button - visible when status is ACCEPTED or APPROVED */}
      {(status === QuotationStatus.ACCEPTED || status === QuotationStatus.APPROVED) && (
        <form action={async () => {
          const { createAgreementFromQuotation } = await import("@/app/actions/crm/agreement.action");
          const res = await createAgreementFromQuotation(quotationId);
          if (res.success && res.agreementId) {
            router.push(`/dashboard/crm/agreements/${res.agreementId}`);
          } else {
            toast({
              title: "Error",
              description: res.error || "Failed to create agreement",
              variant: "destructive",
            });
          }
        }}>
          <Button type="submit" variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <FiCheckCircle className="w-4 h-4 mr-1" />
            Create Agreement
          </Button>
        </form>
      )}
    </div>
  );
}

