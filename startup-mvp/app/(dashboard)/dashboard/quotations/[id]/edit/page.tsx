import { getQuotation } from '@/app/actions/quotations';
import { QuotationFormWrapper } from '@/components/quotation/QuotationFormWrapper';
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
    console.error('Failed to fetch quotation:', result.error);
    notFound();
  }

  console.log('[Edit Page] Raw quotation data from DB:', result.data);

  const quotation = result.data;

  // Convert quotation from database to form data format
  const formData: Record<string, unknown> = {
    quotationNumber: quotation.quotationNumber,
    subject: quotation.subject,
    submittedTo: (quotation as any).client?.name || '',
    date: quotation.date instanceof Date ? quotation.date.toISOString().split('T')[0] : new Date(quotation.date).toISOString().split('T')[0],
    coverLetter: quotation.coverLetter || '',
    financialStatement: quotation.financialStatement || '',
    tos: quotation.tos || '',
    expiredDate: quotation.expiredDate 
      ? (quotation.expiredDate instanceof Date 
          ? quotation.expiredDate.toISOString().split('T')[0] 
          : new Date(quotation.expiredDate).toISOString().split('T')[0])
      : '',
    clientId: quotation.clientId,
    clientName: (quotation as any).client?.name || '',
    clientAddress: (quotation as any).client?.address || '',
    clientContact: (quotation as any).client?.phone || (quotation as any).client?.email || '',
    organizationId: quotation.organizationId || undefined,
    organizationName: quotation.organization?.name || undefined,
    opportunityId: quotation.opportunityId || undefined,
    submittedById: quotation.submittedById,
    submittedBy: (quotation as any).submittedBy?.name || '',
    submittedByContact: (quotation as any).submittedBy?.email || '',
    shippingCharges: quotation.shippingCharges ? Number(quotation.shippingCharges) : 0,
    discount: quotation.discount ? Number(quotation.discount) : 0,
    vatIncluded: quotation.vatIncluded || false,
    projectLocation: quotation.projectLocation || '',
    sections: quotation.section?.map((section: any) => ({
      id: section.id,
      title: section.title,
      note: section.note || '',
      discount: section.discount ? Number(section.discount) : null,
      total: section.total ? Number(section.total) : null,
      grandTotal: section.grandTotal ? Number(section.grandTotal) : null,
      sortOrder: section.sortOrder,
      categoryId: section.categoryId || undefined,
      preparedById: section.preparedById,
      sectionType: section.sectionType || 'PRICING',
      isEnabled: section.isEnabled !== false,
      displayOrder: section.displayOrder,
      metadata: section.metadata || null,
      groups: section.groups?.map((group: any) => {
        // Log group data for debugging
        console.log('[Edit Page] Processing group:', {
          id: group.id,
          description: group.description,
          moduleGroupId: group.moduleGroupId,
          baseUnit: group.baseUnit,
          baseUnitPrice: group.baseUnitPrice,
          baseUnitPriceType: typeof group.baseUnitPrice,
          rawBaseUnitPrice: group.baseUnitPrice,
          hasModuleGroup: !!group.moduleGroupId,
          itemCount: group.items?.length || 0
        });
        
        return {
          id: group.id,
          code: group.code || '',
          description: group.description,
          quantity: group.quantity ? Number(group.quantity) : null,
          sortOrder: group.sortOrder,
          moduleGroupId: group.moduleGroupId || null,
          baseUnit: group.baseUnit || null,
          baseUnitPrice: group.baseUnitPrice ? Number(group.baseUnitPrice) : null,
          items: group.items?.map((item: any) => ({
          id: item.id,
          sl: item.sl,
          no: item.no != null ? String(item.no) : null,
          code: item.code || '',
          description: item.description || '',
          height: item.height ? Number(item.height) : null,
          width: item.width ? Number(item.width) : null,
          depth: item.depth ? Number(item.depth) : null,
          unit: item.unit || null,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
          unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
          totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
          discount: item.discount ? Number(item.discount) : null,
          amount: Number(item.amount),
          sortOrder: item.sortOrder,
          itemId: item.itemId || null,
          moduleGroupItemId: item.moduleGroupItemId || null,
          isCustomItem: !item.moduleGroupItemId, // Mark custom items
          item: item.item ? {
            id: item.item.id,
            code: item.item.code || '',
            description: item.item.description || '',
            unitPrice: Number(item.item.unitPrice),
          } : null,
        })) || [],
        };
      }) || [],
      items: section.items?.map((item: any) => ({
        id: item.id,
        sl: item.sl,
        no: item.no ? Number(item.no) : null,
        code: item.code || '',
        description: item.description || '',
        height: item.height ? Number(item.height) : null,
        width: item.width ? Number(item.width) : null,
        depth: item.depth ? Number(item.depth) : null,
        unit: item.unit || null,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
        totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
        discount: item.discount ? Number(item.discount) : null,
        amount: Number(item.amount),
        sortOrder: item.sortOrder,
        itemId: item.itemId || null,
        item: item.item ? {
          id: item.item.id,
          code: item.item.code || '',
          description: item.item.description || '',
          unitPrice: Number(item.item.unitPrice),
        } : null,
      })) || [],
      categoryGroups: section.categoryGroups?.map((categoryGroup: any) => ({
        id: categoryGroup.id,
        categoryId: categoryGroup.categoryId || undefined,
        sortOrder: categoryGroup.sortOrder,
        items: categoryGroup.items?.map((item: any) => ({
          id: item.id,
          sl: item.sl,
          no: item.no != null ? String(item.no) : null,
          code: item.code || '',
          description: item.description || '',
          height: item.height ? Number(item.height) : null,
          width: item.width ? Number(item.width) : null,
          depth: item.depth ? Number(item.depth) : null,
          unit: item.unit || null,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
          unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
          totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
          discount: item.discount ? Number(item.discount) : null,
          amount: Number(item.amount),
          sortOrder: item.sortOrder,
          itemId: item.itemId || null,
          item: item.item ? {
            id: item.item.id,
            code: item.item.code || '',
            description: item.item.description || '',
            unitPrice: Number(item.item.unitPrice),
          } : null,
        })) || [],
      })) || [],
    })) || [],
  };

  return (
    <QuotationFormWrapper
      quotationId={id} 
      initialData={formData} 
      title="Edit Quotation"
    />
  );
}
