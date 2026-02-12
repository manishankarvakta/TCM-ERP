import { getQuotation } from '@/app/actions/quotations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { notFound } from 'next/navigation';
import DownloadPDFButton from './_components/DownloadPDFButton';
import QuotationActionButtons from '@/app/(dashboard)/dashboard/quotations/[id]/_components/QuotationActionButtons';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

interface QuotationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const { id } = await params;
  const result = await getQuotation(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const quotation = result.data;

  // Check if user has approve permission
  const session = await auth();
  const canApprove = session?.user?.id 
    ? await hasPermission(session.user.id, 'quotations.quotations', 'approve')
    : false;

  console.log('quotation', quotation);
  // Note: PDF download will need to be handled in a client component
  // This is a server component, so we'll create a separate client component for the download button

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/dashboard/quotations">
            <Button variant="outline">
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotations
            </Button>
          </Link>
          <div className="flex gap-2">
            <QuotationActionButtons quotationId={id} status={quotation.status} basePath="/dashboard/quotations" canApprove={canApprove} />
            <DownloadPDFButton quotation={quotation as Record<string, unknown>} />
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{quotation.quotationNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Subject</p>
                <p className="font-medium">{quotation.subject}</p>
              </div>
              <div>
                <p className="text-gray-500">Client</p>
                <p className="font-medium">{quotation.client?.name || quotation.client?.company || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium">{formatDate(quotation.date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium capitalize">{quotation.status}</p>
              </div>
              {quotation.expiredDate && (
                <div>
                  <p className="text-gray-500">Expired Date</p>
                  <p className="font-medium">{formatDate(quotation.expiredDate)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {quotation.section && quotation.section.length > 0 && (
          <div className="space-y-6">
            {quotation.section.map((section, sectionIndex: number) => {
              const discountValue = section.discount ? Number(section.discount) : null;
              
              return (
              <Card key={section.id || sectionIndex}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{section.title}</CardTitle>
                      {section.note && (
                        <p className="text-sm text-gray-500 mt-1">{section.note}</p>
                      )}
                    </div>
                    {section.discount != null && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Discount</p>
                        <p className="font-medium">
                          {typeof section.discount === 'number' 
                            ? `${section.discount}%` 
                            : `${Number(section.discount)}%`}
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Groups */}
                  {section.groups && section.groups.length > 0 && (
                    <div className="space-y-4 mb-6">
                      {section.groups.map((group, groupIndex: number) => (
                        <div key={group.id || groupIndex} className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">
                            {group.code && `${group.code} - `}
                            {group.description}
                          </h4>
                          {group.items && group.items.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-max text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2">SL</th>
                                    <th className="text-left p-2">No</th>
                                    <th className="text-left p-2 whitespace-nowrap">Code</th>
                                    <th className="text-left p-2">Description</th>
                                    <th className="text-right p-2">Qty</th>
                                    <th className="text-right p-2">Unit Price</th>
                                    <th className="text-right p-2">Discount</th>
                                    <th className="text-right p-2">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items?.map((item, itemIndex: number) => (
                                    <tr key={item.id || itemIndex} className="border-b">
                                      <td className="p-2">{item.sl}</td>
                                      <td className="p-2">{item.no || '-'}</td>
                                      <td className="p-2 whitespace-nowrap break-keep">{item.code || '-'}</td>
                                      <td className="p-2">{item.description || '-'}</td>
                                      <td className="text-right p-2">{Number(item.quantity)}</td>
                                      <td className="text-right p-2">{formatCurrency(Number(item.unitPrice))}</td>
                                      <td className="text-right p-2">{formatCurrency(Number(item.discount || 0))}</td>
                                      <td className="text-right p-2 font-medium">
                                        {formatCurrency(Number(item.amount))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category Groups */}
                  {section.categoryGroups && section.categoryGroups.length > 0 && (
                    <div className="space-y-4 mb-6">
                      {section.categoryGroups.map((categoryGroup, categoryGroupIndex: number) => (
                        <div key={categoryGroup.id || categoryGroupIndex} className="border rounded-lg p-4 bg-muted/30">
                          <h4 className="font-semibold mb-2">
                            {categoryGroup.category?.name || 'Uncategorized'}
                          </h4>
                          {categoryGroup.items && categoryGroup.items.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-max text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2">SL</th>
                                    <th className="text-left p-2">No</th>
                                    <th className="text-left p-2 whitespace-nowrap">Code</th>
                                    <th className="text-left p-2">Description</th>
                                    <th className="text-right p-2">Qty</th>
                                    <th className="text-right p-2">Unit Price</th>
                                    <th className="text-right p-2">Discount</th>
                                    <th className="text-right p-2">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {categoryGroup.items?.map((item, itemIndex: number) => (
                                    <tr key={item.id || itemIndex} className="border-b">
                                      <td className="p-2">{item.sl}</td>
                                      <td className="p-2">{item.no || '-'}</td>
                                      <td className="p-2 whitespace-nowrap break-keep">{item.code || '-'}</td>
                                      <td className="p-2 w-94">{item.description || '-'}</td>
                                      <td className="text-right p-2">{Number(item.quantity)}</td>
                                      <td className="text-right p-2">{formatCurrency(Number(item.unitPrice))}</td>
                                      <td className="text-right p-2">{formatCurrency(Number(item.discount || 0))}</td>
                                      <td className="text-right p-2 font-medium">
                                        {formatCurrency(Number(item.amount))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t font-medium">
                                    <td colSpan={4} className="p-2 text-right">Total Items:</td>
                                    <td className="text-right p-2">{categoryGroup.items.length}</td>
                                    <td className="text-right p-2"></td>
                                    <td className="text-right p-2">Total Amount:</td>
                                    <td className="text-right p-2">
                                      {formatCurrency(
                                        categoryGroup.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
                                      )}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Direct Items */}
                  {section.items && section.items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">SL</th>
                            <th className="text-left p-2">No</th>
                            <th className="text-left p-2 whitespace-nowrap">Code</th>
                            <th className="text-left p-2">Description</th>
                            <th className="text-right p-2">Qty</th>
                            <th className="text-right p-2">Unit Price</th>
                            <th className="text-right p-2">Discount</th>
                            <th className="text-right p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items?.map((item, itemIndex: number) => (
                            <tr key={item.id || itemIndex} className="border-b">
                              <td className="p-2">{item.sl}</td>
                              <td className="p-2">{item.no || '-'}</td>
                              <td className="p-2 whitespace-nowrap break-keep">{item.code || '-'}</td>
                              <td className="p-2 w-94">{item.description || '-'}</td>
                              <td className="text-right p-2">{Number(item.quantity)}</td>
                              <td className="text-right p-2">{formatCurrency(Number(item.unitPrice))}</td>
                              <td className="text-right p-2">{formatCurrency(Number(item.discount || 0))}</td>
                              <td className="text-right p-2 font-medium">
                                {formatCurrency(Number(item.amount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section Total - Calculate from items */}
                  <div className="mt-4 text-right">
                    {(() => {
                      let sectionTotal = 0;
                      if (section.items) {
                        section.items.forEach((item) => {
                          sectionTotal += Number(item.amount || 0);
                        });
                      }
                      if (section.groups) {
                        section.groups.forEach((group) => {
                          if (group.items) {
                            group.items.forEach((item) => {
                              sectionTotal += Number(item.amount || 0);
                            });
                          }
                        });
                      }
                      if (section.categoryGroups) {
                        section.categoryGroups.forEach((categoryGroup) => {
                          if (categoryGroup.items) {
                            categoryGroup.items.forEach((item) => {
                              sectionTotal += Number(item.amount || 0);
                            });
                          }
                        });
                      }
                      // Apply discount (amount-based, not percentage)
                      if (discountValue != null && discountValue > 0) {
                        sectionTotal = Math.max(0, sectionTotal - discountValue);
                      }
                      return (
                        <p className="text-lg font-semibold">
                          Section Total: {formatCurrency(sectionTotal)}
                        </p>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}

        {/* Grand Total */}
        <Card className="mt-6">
          <CardContent className="py-6">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-2xl font-bold">
                  Grand Total: {formatCurrency(Number(quotation.total))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
