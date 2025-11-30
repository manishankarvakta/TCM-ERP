import { getQuotation } from '@/app/actions/quotations';
import EditQuotationForm from './EditQuotationForm';
import { notFound } from 'next/navigation';

interface EditQuotationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuotationPage({ params }: EditQuotationPageProps) {
  const { id } = await params;
  const result = await getQuotation(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const quotation = result.data;

  // Convert quotation from database to form data format
  const formData: Record<string, unknown> = {
    quotationNumber: quotation.quotationNumber,
    subject: quotation.subject,
    submittedTo: quotation.submittedTo,
    date: quotation.date instanceof Date ? quotation.date.toISOString().split('T')[0] : new Date(quotation.date).toISOString().split('T')[0],
    coverLetter: quotation.coverLetter || '',
    financialStatement: quotation.financialStatement || '',
    tos: quotation.tos || '',
    status: quotation.status,
    clientId: quotation.clientId,
    clientName: quotation.client?.name || '',
    clientAddress: quotation.client?.address || '',
    clientContact: quotation.client?.phone || quotation.client?.email || '',
    submittedById: quotation.submittedById,
    submittedBy: quotation.submittedBy?.name || '',
    submittedByContact: quotation.submittedBy?.email || '',
    modules: quotation.section?.map((section) => ({
      id: section.id,
      title: section.title,
      note: section.note || '',
      discount: section.discount ? Number(section.discount) : null,
      sortOrder: section.sortOrder,
      preparedById: section.preparedById,
      groups: section.groups?.map((group) => ({
        id: group.id,
        code: group.code || '',
        description: group.description,
        quantity: group.quantity ? Number(group.quantity) : null,
        sortOrder: group.sortOrder,
        items: group.items?.map((item) => ({
          id: item.id,
          sl: item.sl,
          code: item.code || '',
          description: item.description || '',
          height: item.height ? Number(item.height) : null,
          width: item.width ? Number(item.width) : null,
          depth: item.depth ? Number(item.depth) : null,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
          unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
          totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
          amount: Number(item.amount),
          note: item.note || '',
          sortOrder: item.sortOrder,
          itemId: item.itemId,
        })) || [],
      })) || [],
      items: section.items?.map((item) => ({
        id: item.id,
        sl: item.sl,
        code: item.code || '',
        description: item.description || '',
        height: item.height ? Number(item.height) : null,
        width: item.width ? Number(item.width) : null,
        depth: item.depth ? Number(item.depth) : null,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
        totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
        amount: Number(item.amount),
        note: item.note || '',
        sortOrder: item.sortOrder,
        itemId: item.itemId,
      })) || [],
    })) || [],
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Edit Quotation</h1>
        <EditQuotationForm quotationId={id} initialData={formData} />
      </div>
    </div>
  );
}
