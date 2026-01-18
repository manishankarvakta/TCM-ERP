import { getWorkOrder } from '@/app/actions/work-orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FiArrowLeft, FiEdit } from 'react-icons/fi';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { WorkOrderStatus } from '@prisma/client';
import { updateWorkOrderStatus } from '@/app/actions/work-orders';
import WorkOrderStatusButton from './_components/WorkOrderStatusButton';

interface WorkOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const statusColors: Record<WorkOrderStatus, string> = {
  PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETE: "bg-green-100 text-green-800",
  CANCELED: "bg-red-100 text-red-800",
  HOLD: "bg-yellow-100 text-yellow-800",
};

export default async function WorkOrderDetailPage({ params }: WorkOrderDetailPageProps) {
  const { id } = await params;
  const result = await getWorkOrder(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const workOrder = result.data;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <Link href="/dashboard/work-orders">
            <Button variant="outline">
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/dashboard/work-orders/${id}/edit`}>
              <Button variant="outline">
                <FiEdit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <WorkOrderStatusButton workOrderId={id} currentStatus={workOrder.status} />
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{workOrder.code}</CardTitle>
              <Badge className={statusColors[workOrder.status]}>
                {workOrder.status.charAt(0) + workOrder.status.slice(1).toLowerCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Quotation</p>
                <p className="font-medium">
                  {workOrder.quotation?.quotationNumber || 'N/A'}
                </p>
                {workOrder.quotation?.subject && (
                  <p className="text-xs text-gray-400">{workOrder.quotation.subject}</p>
                )}
              </div>
              <div>
                <p className="text-gray-500">Client</p>
                <p className="font-medium">
                  {workOrder.quotation?.client?.name || workOrder.quotation?.client?.company || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Created By</p>
                <p className="font-medium">{workOrder.createdBy?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Amount</p>
                <p className="font-medium text-lg">{formatCurrency(workOrder.amount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Advance</p>
                <p className="font-medium">
                  {workOrder.advance ? formatCurrency(workOrder.advance) : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Balance</p>
                <p className="font-medium text-lg text-green-600">
                  {formatCurrency(workOrder.balance)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Created Date</p>
                <p className="font-medium">{formatDate(workOrder.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {workOrder.quotation && (
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Quotation Number</p>
                  <p className="font-medium">{workOrder.quotation.quotationNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Subject</p>
                  <p className="font-medium">{workOrder.quotation.subject}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(workOrder.quotation.date)}</p>
                </div>
                {workOrder.quotation.client && (
                  <>
                    <div>
                      <p className="text-gray-500">Client Name</p>
                      <p className="font-medium">{workOrder.quotation.client.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Company</p>
                      <p className="font-medium">{workOrder.quotation.client.company || 'N/A'}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

