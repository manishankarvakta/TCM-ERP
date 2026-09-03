'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { getQuotations, getQuotation } from '@/app/actions/quotations';
// @ts-expect-error - Legacy compatibility
import { WorkOrderStatus, QuotationStatus } from '@prisma/client';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiSearch } from 'react-icons/fi';

const workOrderSchema = z.object({
  quotationId: z.string().min(1, 'Quotation is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  advance: z.number().min(0).optional(),
  status: z.nativeEnum(WorkOrderStatus).default(WorkOrderStatus.PROGRESS),
});

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

interface WorkOrderFormProps {
  initialData?: {
    quotationId?: string;
    amount?: number;
    advance?: number;
    status?: WorkOrderStatus;
  };
  onSubmit: (data: WorkOrderFormValues) => Promise<void>;
  isSubmitting?: boolean;
  onQuotationSelect?: (quotation: any) => void;
}

export function WorkOrderForm({ initialData, onSubmit, isSubmitting = false, onQuotationSelect }: WorkOrderFormProps) {
  const [quotations, setQuotations] = useState<Array<{ 
    id: string; 
    quotationNumber: string; 
    subject: string;
    status: string;
    client?: { name: string | null; company: string | null } | null;
  }>>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [quotationSearch, setQuotationSearch] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>(initialData?.quotationId || '');
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [amount, setAmount] = useState<number>(initialData?.amount || 0);
  const [advance, setAdvance] = useState<number>(initialData?.advance || 0);
  const [balance, setBalance] = useState<number>(0);
  const [status, setStatus] = useState<WorkOrderStatus>(initialData?.status || WorkOrderStatus.PROGRESS);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
// @ts-expect-error - Legacy compatibility
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      quotationId: initialData?.quotationId || '',
      amount: initialData?.amount || 0,
      advance: initialData?.advance || 0,
      status: initialData?.status || WorkOrderStatus.PROGRESS,
    },
  });

  // Fetch only ACCEPTED quotations that don't have work orders
  useEffect(() => {
    const fetchQuotations = async () => {
      setIsLoadingQuotations(true);
      try {
        const result = await getQuotations(1, 1000, '', QuotationStatus.ACCEPTED);
        if (result.success && result.quotations) {
          // Filter to only ACCEPTED status quotations that don't have work orders
          const availableQuotations = result.quotations.filter((q: any) => 
            q.status === QuotationStatus.ACCEPTED &&
            (!q.workOrders || q.workOrders.length === 0)
          );
          setQuotations(availableQuotations.map((q: any) => ({
            id: q.id,
            quotationNumber: q.quotationNumber,
            subject: q.subject,
            status: q.status,
            client: q.client,
          })));
        }
      } catch (error) {
        console.error('Error fetching quotations:', error);
      } finally {
        setIsLoadingQuotations(false);
      }
    };

    fetchQuotations();
  }, []);

  // Calculate balance when amount or advance changes
  useEffect(() => {
    const calculatedBalance = amount - advance;
    setBalance(Math.max(0, calculatedBalance));
// @ts-expect-error - Legacy compatibility
    setValue('amount', amount);
// @ts-expect-error - Legacy compatibility
    setValue('advance', advance);
  }, [amount, advance, setValue]);

  // Fetch full quotation details when selected
  useEffect(() => {
    const fetchQuotationDetails = async () => {
      if (!selectedQuotationId) {
        setSelectedQuotation(null);
        if (onQuotationSelect) {
          onQuotationSelect(null);
        }
        return;
      }

      try {
        const result = await getQuotation(selectedQuotationId);
        if (result.success && result.data) {
          setSelectedQuotation(result.data);
          
          // Auto-populate amount from quotation grandTotal
          if (result.data.grandTotal) {
            setAmount(Number(result.data.grandTotal));
          }
          
          // Notify parent component
          if (onQuotationSelect) {
            onQuotationSelect(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching quotation details:', error);
      }
    };

    fetchQuotationDetails();
  }, [selectedQuotationId, onQuotationSelect]);

  // Filter quotations based on search
  const filteredQuotations = useMemo(() => {
    if (!quotationSearch) return quotations;
    
    const searchLower = quotationSearch.toLowerCase();
    return quotations.filter((quotation) => {
      const matchesNumber = quotation.quotationNumber?.toLowerCase().includes(searchLower);
      const matchesSubject = quotation.subject?.toLowerCase().includes(searchLower);
      const matchesClient = quotation.client?.name?.toLowerCase().includes(searchLower) ||
                           quotation.client?.company?.toLowerCase().includes(searchLower);
      return matchesNumber || matchesSubject || matchesClient;
    });
  }, [quotations, quotationSearch]);

  const handleFormSubmit = async (data: WorkOrderFormValues) => {
    await onSubmit({
      ...data,
      quotationId: selectedQuotationId,
      amount,
      advance: advance || 0,
      status,
    });
  };

  return (
// @ts-expect-error - Legacy compatibility
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Work Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quotation Selection with Search */}
          <div>
            <Label htmlFor="quotationId" className="text-sm font-medium">
              Quotation (Accepted Only) <span className="text-red-500">*</span>
            </Label>
            {isLoadingQuotations ? (
              <div className="h-10 flex items-center text-sm text-gray-500">
                Loading accepted quotations...
              </div>
            ) : (
              <div className="flex gap-2 items-center w-full">
                <div className="flex-1 relative w-full min-w-0">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                  <Select
                    value={selectedQuotationId || undefined}
                    onValueChange={(value) => {
                      setSelectedQuotationId(value);
// @ts-expect-error - Legacy compatibility
                      setValue('quotationId', value);
                    }}
                    disabled={!!initialData?.quotationId}
                  >
                    <SelectTrigger className="h-10 text-sm pl-8 w-full min-w-0 text-left">
                      <SelectValue placeholder="Search and select an accepted quotation" className="truncate block" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search quotations..."
                          value={quotationSearch}
                          onChange={(e) => setQuotationSearch(e.target.value)}
                          className="h-8 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredQuotations.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          {quotationSearch ? 'No quotations found' : 'No accepted quotations available'}
                        </div>
                      ) : (
                        filteredQuotations.map((quotation) => (
                          <SelectItem key={quotation.id} value={quotation.id} className="text-left">
                            <div className="flex flex-col">
                              <span className="font-medium">{quotation.quotationNumber}</span>
                              {quotation.subject && (
                                <span className="text-xs text-muted-foreground">
                                  {quotation.subject}
                                  {quotation.client && (
                                    <span className="ml-1">
                                      - {quotation.client.name || quotation.client.company || ''}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {errors.quotationId && (
              <p className="text-sm text-red-500 mt-1">{errors.quotationId.message}</p>
            )}
            {!isLoadingQuotations && quotations.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">
                No accepted quotations available. Only quotations with ACCEPTED status can be used for work orders.
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setAmount(value);
              }}
              className="h-10"
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Advance */}
          <div>
            <Label htmlFor="advance" className="text-sm font-medium">
              Advance
            </Label>
            <Input
              id="advance"
              type="number"
              step="0.01"
              min="0"
              value={advance || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setAdvance(value);
              }}
              className="h-10"
            />
          </div>

          {/* Balance (calculated, read-only) */}
          <div>
            <Label htmlFor="balance" className="text-sm font-medium">
              Balance (Calculated)
            </Label>
            <Input
              id="balance"
              type="text"
              value={formatCurrency(balance)}
              readOnly
              className="h-10 bg-muted"
            />
            <p className="text-xs text-gray-500 mt-1">Balance = Amount - Advance</p>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status" className="text-sm font-medium">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as WorkOrderStatus);
// @ts-expect-error - Legacy compatibility
                setValue('status', value as WorkOrderStatus);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WorkOrderStatus.PROGRESS}>Progress</SelectItem>
                <SelectItem value={WorkOrderStatus.COMPLETE}>Complete</SelectItem>
                <SelectItem value={WorkOrderStatus.CANCELED}>Canceled</SelectItem>
                <SelectItem value={WorkOrderStatus.HOLD}>Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update Work Order' : 'Create Work Order'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

