'use client';

import { WorkOrderForm } from '@/components/work-order/WorkOrderForm';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createWorkOrder } from '@/app/actions/work-orders';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    startTransition(async () => {
      try {
        const result = await createWorkOrder(data);

        if (result.success && result.data) {
          toast({
            title: 'Success',
            description: 'Work order created successfully',
          });
          router.push('/dashboard/work-orders');
        } else {
          const errorMessage = result.error || 'Failed to create work order';
          setError(errorMessage);
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Create Work Order</h1>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div>
            <ErrorBoundary>
              <WorkOrderForm 
                onSubmit={handleSubmit} 
                isSubmitting={isSubmitting}
                onQuotationSelect={setSelectedQuotation}
              />
            </ErrorBoundary>
          </div>

          {/* Right Column - Quotation Details */}
          <div>
            {selectedQuotation ? (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Quotation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Quotation Number</p>
                      <p className="font-medium">{selectedQuotation.quotationNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">{formatDate(selectedQuotation.date)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Subject</p>
                      <p className="font-medium">{selectedQuotation.subject}</p>
                    </div>
                    {selectedQuotation.client && (
                      <>
                        <div>
                          <p className="text-gray-500">Client Name</p>
                          <p className="font-medium">{selectedQuotation.client.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Company</p>
                          <p className="font-medium">{selectedQuotation.client.company || 'N/A'}</p>
                        </div>
                        {selectedQuotation.client.email && (
                          <div>
                            <p className="text-gray-500">Email</p>
                            <p className="font-medium">{selectedQuotation.client.email}</p>
                          </div>
                        )}
                        {selectedQuotation.client.phone && (
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium">{selectedQuotation.client.phone}</p>
                          </div>
                        )}
                      </>
                    )}
                    {selectedQuotation.organization && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Organization</p>
                        <p className="font-medium">{selectedQuotation.organization.name}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium">{formatCurrency(selectedQuotation.total || 0)}</span>
                    </div>
                    {selectedQuotation.discount && selectedQuotation.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Discount</span>
                        <span className="font-medium">-{formatCurrency(selectedQuotation.discount)}</span>
                      </div>
                    )}
                    {selectedQuotation.shippingCharges && selectedQuotation.shippingCharges > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Shipping Charges</span>
                        <span className="font-medium">{formatCurrency(selectedQuotation.shippingCharges)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                      <span>Grand Total</span>
                      <span>{formatCurrency(selectedQuotation.grandTotal || 0)}</span>
                    </div>
                  </div>

                  {selectedQuotation.status && (
                    <div>
                      <p className="text-gray-500 text-sm">Status</p>
                      <p className="font-medium capitalize">{selectedQuotation.status.toLowerCase()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Quotation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 text-center py-8">
                    Select a quotation to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

