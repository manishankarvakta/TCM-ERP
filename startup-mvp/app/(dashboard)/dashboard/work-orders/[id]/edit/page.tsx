import { getWorkOrder } from '@/app/actions/work-orders';
import { notFound } from 'next/navigation';
import EditWorkOrderForm from './EditWorkOrderForm';

interface EditWorkOrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditWorkOrderPage({ params }: EditWorkOrderPageProps) {
  const { id } = await params;
  const result = await getWorkOrder(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const workOrder = result.data;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Work Order</h1>
        <EditWorkOrderForm workOrderId={id} initialData={workOrder} />
      </div>
    </div>
  );
}

