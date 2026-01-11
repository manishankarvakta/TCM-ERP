'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateWorkOrderStatus } from '@/app/actions/work-orders';
import { useToast } from '@/hooks/use-toast';
import { WorkOrderStatus } from '@prisma/client';
import { FiMoreVertical } from 'react-icons/fi';

interface WorkOrderStatusButtonProps {
  workOrderId: string;
  currentStatus: WorkOrderStatus;
}

export default function WorkOrderStatusButton({ workOrderId, currentStatus }: WorkOrderStatusButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    startTransition(async () => {
      const result = await updateWorkOrderStatus(workOrderId, newStatus);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Work order status updated to ${newStatus}`,
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update work order status',
          variant: 'destructive',
        });
      }
    });
  };

  const statusOptions = [
    { value: WorkOrderStatus.PROGRESS, label: 'Progress' },
    { value: WorkOrderStatus.COMPLETE, label: 'Complete' },
    { value: WorkOrderStatus.CANCELED, label: 'Canceled' },
    { value: WorkOrderStatus.HOLD, label: 'Hold' },
  ].filter(option => option.value !== currentStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          <FiMoreVertical className="w-4 h-4 mr-2" />
          Change Status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

