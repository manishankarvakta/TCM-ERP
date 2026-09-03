'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { getActiveClients } from '@/app/actions/clients';
import { createDirectOrder } from '@/app/actions/orders';
import { OrderStatus } from '@prisma/client';
import { FiPlus, FiTrash } from 'react-icons/fi';

const directOrderSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
  items: z.array(
    z.object({
      description: z.string().min(1, 'Description is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
      unitPrice: z.coerce.number().min(0.01, 'Price must be greater than 0'),
    })
  ).min(1, 'At least one item is required'),
});

type DirectOrderFormValues = z.infer<typeof directOrderSchema>;

export function DirectOrderForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<Array<{ id: string; name: string | null; company: string | null }>>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DirectOrderFormValues>({
// @ts-expect-error - Legacy compatibility
    resolver: zodResolver(directOrderSchema),
    defaultValues: {
      clientId: '',
      status: OrderStatus.PENDING,
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch items to calculate totals dynamically
  const watchedItems = watch('items');
  const totalValue = watchedItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  useEffect(() => {
    async function loadClients() {
      try {
        const result = await getActiveClients();
        if (result.success && result.clients) {
          setClients(result.clients);
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to load clients',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    }
    loadClients();
  }, [toast]);

  const onSubmitForm = async (values: DirectOrderFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createDirectOrder({
        clientId: values.clientId,
        status: values.status,
        items: values.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Direct order created successfully',
        });
        router.push('/dashboard/quotations/orders');
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
// @ts-expect-error - Legacy compatibility
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Direct Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Selection */}
            <div>
              <Label htmlFor="clientId" className="text-sm font-medium">
                Client / Customer <span className="text-red-500">*</span>
              </Label>
              {isLoadingClients ? (
                <div className="h-10 flex items-center text-sm text-gray-500">
                  Loading clients...
                </div>
              ) : (
                <Select
                  onValueChange={(val) => setValue('clientId', val, { shouldValidate: true })}
                >
                  <SelectTrigger className="h-10 w-full mt-1">
                    <SelectValue placeholder="Select a Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name || client.company || 'Unnamed Client'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.clientId && (
                <p className="text-sm text-red-500 mt-1">{errors.clientId.message}</p>
              )}
            </div>

            {/* Status Selection */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                Order Status
              </Label>
              <Select
                defaultValue={OrderStatus.PENDING}
                onValueChange={(val) => setValue('status', val as OrderStatus)}
              >
                <SelectTrigger className="h-10 w-full mt-1">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrderStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={OrderStatus.PROCESSING}>Processing</SelectItem>
                  <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
                  <SelectItem value={OrderStatus.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
            className="flex items-center gap-1"
          >
            <FiPlus className="w-4 h-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start border-b pb-4 last:border-0 last:pb-0">
              {/* Item Description */}
              <div className="flex-1 w-full">
                <Label className="text-xs font-semibold text-gray-500">Item Description</Label>
                <Input
                  {...register(`items.${index}.description` as const)}
                  placeholder="e.g., Domain Registration (example.com)"
                  className="mt-1"
                />
                {errors.items?.[index]?.description && (
                  <p className="text-xs text-red-500 mt-1">{errors.items[index]?.description?.message}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="w-full md:w-24">
                <Label className="text-xs font-semibold text-gray-500">Qty</Label>
                <Input
                  type="number"
                  {...register(`items.${index}.quantity` as const)}
                  className="mt-1"
                />
                {errors.items?.[index]?.quantity && (
                  <p className="text-xs text-red-500 mt-1">{errors.items[index]?.quantity?.message}</p>
                )}
              </div>

              {/* Unit Price */}
              <div className="w-full md:w-36">
                <Label className="text-xs font-semibold text-gray-500">Unit Price (TK)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.unitPrice` as const)}
                  className="mt-1"
                />
                {errors.items?.[index]?.unitPrice && (
                  <p className="text-xs text-red-500 mt-1">{errors.items[index]?.unitPrice?.message}</p>
                )}
              </div>

              {/* Subtotal & Delete Action */}
              <div className="w-full md:w-40 flex items-end gap-2 self-stretch pt-6 md:pt-0">
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block md:hidden">Subtotal</span>
                  <div className="h-10 flex items-center px-3 bg-gray-50 border rounded-md text-sm font-medium text-gray-600">
                    {((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0)).toFixed(2)} TK
                  </div>
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <FiTrash className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Grand Total display */}
          <div className="flex justify-end border-t pt-4">
            <div className="text-right">
              <span className="text-sm text-gray-500">Total Value:</span>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {totalValue.toFixed(2)} TK
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/quotations/orders')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Direct Order'}
        </Button>
      </div>
    </form>
  );
}
