import { getQuotation } from '@/app/actions/quotations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { notFound } from 'next/navigation';
import DownloadPDFButton from './_components/DownloadPDFButton';
import QuotationActionButtons from '@/app/(dashboard)/dashboard/quotations/[id]/_components/QuotationActionButtons';
import { TemplateToggleButton } from './_components/TemplateToggleButton';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { SectionViewRenderer } from '@/components/quotation/SectionViewRenderer';
import { replaceQuotationTemplates } from '@/lib/quotation/templateReplacer';

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
  
  // A section type is considered a "dynamic cover" if it handles the intro content
  const hasDynamicCover = quotation.section?.some(
    (s: any) => (s.sectionType === 'COVER' || s.sectionType === 'COVER_LETTER') && s.isEnabled !== false
  );
  // A section type is considered a "dynamic terms" if it handles legal content
  const hasDynamicTerms = quotation.section?.some(
    (s: any) => (s.sectionType === 'TERMS' || s.sectionType === 'LEGAL_TERMS') && s.isEnabled !== false
  );

  // Check if user has approve permission
  const session = await auth();
  const canApprove = session?.user?.id 
    ? await hasPermission(session.user.id, 'quotations.quotations', 'approve')
    : false;
  // Note: PDF download will need to be handled in a client component
  // This is a server component, so we'll create a separate client component for the download button

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <Link href="/dashboard/quotations">
            <Button variant="outline" className="bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors">
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotations
            </Button>
          </Link>
          <div className="flex flex-wrap gap-2 items-center bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
            <TemplateToggleButton quotationId={id} isTemplate={(quotation as any).isTemplate ?? false} />
            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
            <QuotationActionButtons quotationId={id} status={quotation.status} basePath="/dashboard/quotations" canApprove={canApprove} />
            <DownloadPDFButton quotation={quotation as Record<string, unknown>} />
          </div>
        </div>

        {/* Page 1: COVER PAGE (No Header/Footer) */}
        <div className="bg-white border border-gray-300 shadow-lg p-12 md:p-16 max-w-4xl mx-auto rounded-none relative min-h-[11in] flex flex-col justify-between text-black mb-8">
          <div>
            {/* Title / Subject */}
            <div className="mb-10 pt-8">
              <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">
                Software Development Proposal
              </h1>
              <p className="text-base text-gray-800 font-medium leading-relaxed">
                {quotation.subject}
              </p>
              <div className="mt-4 flex flex-wrap gap-6 text-xs text-gray-500 font-semibold">
                <p>Ref: <span className="text-black">{quotation.quotationNumber}</span></p>
                <p>Date: <span className="text-black">{formatDate(quotation.date)}</span></p>
              </div>
            </div>

            {/* Prepared For & By grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-y border-gray-200 py-6 mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Prepared For</p>
                <p className="text-sm font-bold text-black">{quotation.client?.name || quotation.client?.company || 'N/A'}</p>
                <p className="text-xs text-gray-600 mt-0.5">{quotation.client?.company}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Prepared By</p>
                <p className="text-sm font-bold text-black">{quotation.submittedBy?.name || 'Authorized Representative'}</p>
                <p className="text-xs text-gray-600 mt-0.5">{quotation.organization?.name || 'Our Organization'}</p>
              </div>
            </div>
          </div>
          <div /> {/* Empty footer placeholder to maintain flex-col balance */}
        </div>

        {/* Page 2: COVER LETTER PAGE (With Repeating Header/Footer) */}
        {!hasDynamicCover && (quotation.coverLetter || (quotation as any).financialStatement) && (
          <div className="bg-white border border-gray-300 shadow-lg p-12 md:p-16 max-w-4xl mx-auto rounded-none relative min-h-[11in] flex flex-col justify-between text-black mb-8 print:break-before-page">
            <div>
              {/* Header */}
              <div className="flex items-end gap-4 mb-10 pb-4">
                <img src="/techsoul-logo.webp" className="h-7 w-auto object-contain flex-shrink-0" alt="Techsoul Logo" />
                <div className="h-[0.5px] bg-black/60 flex-1 mb-[5px]" />
              </div>

              <div className="py-6 mb-8">
                <div className="max-w-3xl">
                  <h2 className="text-xl font-bold text-black mb-4">Introduction</h2>
                  {quotation.coverLetter && (
                    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed mb-8 shrink-0 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: replaceQuotationTemplates(quotation.coverLetter, quotation) }} />
                  )}
                  
                  {/* Embedded Financial Summary if it exists */}
                  {(quotation as any).financialStatement && (
                     <div className="bg-white rounded-none p-6 border border-gray-200 mt-4">
                       <h3 className="text-base font-bold text-black mb-4">Financial Investment Summary</h3>
                       <div dangerouslySetInnerHTML={{ __html: replaceQuotationTemplates((quotation as any).financialStatement, quotation) }} className="text-xs text-gray-700 leading-relaxed" />
                     </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-6 flex justify-between items-start text-xs text-black font-semibold leading-relaxed">
              <div className="h-[0.5px] bg-black/60 flex-1 mr-8 mt-2" />
              <div className="flex items-start gap-4 flex-shrink-0">
                <div className="text-right">
                  <p>techsoul.inc.bd@gmail.com</p>
                  <p>https://techsoulbd.com</p>
                  <p>+8801683723969</p>
                </div>
                <img src="/techsoul-qr.png" className="h-12 w-12 object-contain" alt="QR Code" />
              </div>
            </div>
          </div>
        )}

        {/* Pages 2+: SECTION PAGES (One Section per Page Card, with Repeating Header/Footer) */}
        {quotation.section && quotation.section.length > 0 && (
          <div className="space-y-8">
            {quotation.section
              .filter((section: any) => section.isEnabled !== false)
              .map((section: any, index: number) => {
                const discountValue = section.discount ? Number(section.discount) : null;
                const sectionIndex = index;
                
                // Calculate raw total before discount
                let rawSectionTotal = 0;
                if (section.items) {
                  section.items.forEach((item: any) => { rawSectionTotal += Number(item.amount || 0); });
                }
                if (section.groups) {
                  section.groups.forEach((group: any) => {
                    if (group.items) {
                      group.items.forEach((item: any) => { rawSectionTotal += Number(item.amount || 0); });
                    }
                  });
                }
                if (section.categoryGroups) {
                  section.categoryGroups.forEach((catGroup: any) => {
                    if (catGroup.items) {
                      catGroup.items.forEach((item: any) => { rawSectionTotal += Number(item.amount || 0); });
                    }
                  });
                }
                
                return (
                  <div key={section.id || sectionIndex} className="bg-white border border-gray-300 shadow-lg p-12 md:p-16 max-w-4xl mx-auto rounded-none relative min-h-[11in] flex flex-col justify-between text-black mb-8 print:break-before-page">
                    <div>
                      {/* Header */}
                      <div className="flex items-end gap-4 mb-10 pb-4">
                        <img src="/techsoul-logo.webp" className="h-7 w-auto object-contain flex-shrink-0" alt="Techsoul Logo" />
                        <div className="h-[0.5px] bg-black/60 flex-1 mb-[5px]" />
                      </div>

                      {/* Section content */}
                      <div className="mb-6">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Section {sectionIndex + 1}</span>
                        <h2 className="text-xl font-bold text-black">{section.title}</h2>
                        {section.note && (
                          <p className="text-gray-500 mt-2 text-xs leading-relaxed">{section.note}</p>
                        )}
                      </div>

                      {/* Unified Section Content Renderer (Metadata-driven) */}
                      {section.sectionType !== 'PRICING' && <SectionViewRenderer section={section} quotation={quotation} />}

                      {/* Render items/groups tables ONLY for PRICING-type sections wrapped in a border box */}
                      {(section.sectionType === 'PRICING' || !section.sectionType) && (
                        <div className="border border-gray-200 p-6 mt-4 space-y-6 bg-white">
                          <div className="space-y-8">
                            {section.groups && section.groups.length > 0 && (
                              <div className="space-y-8">
                                {section.groups.map((group: any, groupIndex: number) => (
                                  <div key={group.id || groupIndex}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="h-5 w-1 bg-black rounded-none" />
                                      <h4 className="text-base font-bold text-black">
                                        {group.code && <span className="text-gray-400 mr-2">{group.code}</span>}
                                        {group.description}
                                      </h4>
                                    </div>
                                    {renderTable(group.items)}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Category Groups Rendering */}
                            {section.categoryGroups && section.categoryGroups.length > 0 && (
                              <div className="space-y-8">
                                {section.categoryGroups.map((catGroup: any, idx: number) => (
                                  <div key={catGroup.id || idx}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="h-5 w-1 bg-black rounded-none" />
                                      <h4 className="text-base font-bold text-black">
                                        {catGroup.category?.name || 'Uncategorized'}
                                      </h4>
                                    </div>
                                    {renderTable(catGroup.items)}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Direct Items */}
                            {section.items && section.items.length > 0 && renderTable(section.items)}
                          </div>

                          {/* Billing Summary Block inside the border box */}
                          <div className="border-t border-gray-200 pt-6 flex justify-end">
                            <div className="w-full max-w-[280px] space-y-2 text-right">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Section Subtotal:</span>
                                <span className="font-semibold text-black">Tk {formatCurrency(rawSectionTotal)}</span>
                              </div>
                              {discountValue != null && discountValue > 0 && (
                                <div className="flex justify-between text-xs text-red-600 font-semibold">
                                  <span>Section Discount:</span>
                                  <span>- Tk {formatCurrency(discountValue)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-gray-150 pt-2 text-sm font-black text-black">
                                <span>Net Section Investment:</span>
                                <span>Tk {formatCurrency(calculateSectionTotal(section))}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-16 pt-6 flex justify-between items-start text-xs text-black font-semibold leading-relaxed">
                      <div className="h-[0.5px] bg-black/60 flex-1 mr-8 mt-2" />
                      <div className="flex items-start gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p>techsoul.inc.bd@gmail.com</p>
                          <p>https://techsoulbd.com</p>
                          <p>+8801683723969</p>
                        </div>
                        <img src="/techsoul-qr.png" className="h-12 w-12 object-contain" alt="QR Code" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Page 8 (Final): THANK YOU PAGE (With Repeating Header/Footer) */}
        <div className="bg-white border border-gray-300 shadow-lg p-12 md:p-16 max-w-4xl mx-auto rounded-none relative min-h-[11in] flex flex-col justify-between text-black mb-8 print:break-before-page">
          <div>
            {/* Header */}
            <div className="flex items-end gap-4 mb-10 pb-4">
              <img src="/techsoul-logo.webp" className="h-7 w-auto object-contain flex-shrink-0" alt="Techsoul Logo" />
              <div className="h-[0.5px] bg-black/60 flex-1 mb-[5px]" />
            </div>

            <div className="flex flex-col items-center justify-center text-center py-24 my-auto">
              <h2 className="text-3xl font-extrabold text-black mb-6 tracking-tight">Thank You</h2>
              <p className="text-base text-gray-700 max-w-lg leading-relaxed mb-8">
                We sincerely appreciate your business and the opportunity to work together. 
                Our team at Techsoul is fully committed to delivering a high-quality solution that drives your success.
              </p>
              <div className="w-16 h-[1.5px] bg-black mb-8" />
              <p className="text-sm font-bold text-black uppercase tracking-widest">Techsoul Team</p>
              <p className="text-xs text-gray-500 mt-1">Authorized Representative</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-6 flex justify-between items-start text-xs text-black font-semibold leading-relaxed">
            <div className="h-[0.5px] bg-black/60 flex-1 mr-8 mt-2" />
            <div className="flex items-start gap-4 flex-shrink-0">
              <div className="text-right">
                <p>techsoul.inc.bd@gmail.com</p>
                <p>https://techsoulbd.com</p>
                <p>+8801683723969</p>
              </div>
              <img src="/techsoul-qr.png" className="h-12 w-12 object-contain" alt="QR Code" />
            </div>
          </div>
        </div>
        
        {/* Helper for Terms & Conditions or Footer */}
        {/* Terms & Conditions — shown only when there is no dynamic TERMS/LEGAL_TERMS section */}
        {!hasDynamicTerms && quotation.tos && (
          <div className="mt-12 max-w-3xl mx-auto text-center px-4">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Terms &amp; Conditions</h3>
             <div className="text-xs text-gray-400 leading-relaxed text-left max-h-40 overflow-y-auto p-6 bg-white rounded-xl border border-gray-100" dangerouslySetInnerHTML={{ __html: replaceQuotationTemplates(quotation.tos, quotation) }} />
          </div>
        )}
      </div>
    </div>
  );
}

// HELPER COMPONENTS & FUNCTIONS

function renderTable(items: any[]) {
  if (!items || items.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-none border border-gray-200 bg-white mt-4 print:break-inside-avoid">
      <table className="w-full text-left border-collapse border border-gray-200">
        <thead>
          <tr className="bg-white border-b border-gray-200">
            <th className="py-4 px-6 text-[10px] font-bold text-gray-700 uppercase tracking-widest border-r border-gray-200">SL</th>
            <th className="py-4 px-6 text-[10px] font-bold text-gray-700 uppercase tracking-widest border-r border-gray-200">Description</th>
            <th className="py-4 px-6 text-[10px] font-bold text-gray-700 uppercase tracking-widest text-right border-r border-gray-200">Qty</th>
            <th className="py-4 px-6 text-[10px] font-bold text-gray-700 uppercase tracking-widest text-right border-r border-gray-200">Unit Price</th>
            <th className="py-4 px-6 text-[10px] font-bold text-gray-700 uppercase tracking-widest text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item, idx) => (
            <tr key={item.id || idx} className="group hover:bg-gray-50/50 transition-all duration-300 print:break-inside-avoid">
              <td className="py-4 px-6 text-sm text-gray-500 font-semibold border-r border-gray-200">{item.sl || idx + 1}</td>
              <td className="py-4 px-6 border-r border-gray-200">
                <div className="text-sm font-bold text-gray-900 group-hover:text-black transition-colors">{item.code && <span className="text-gray-600 mr-2 font-bold">[{item.code}]</span>}{item.description}</div>
                {item.no && <div className="text-[10px] text-gray-400 mt-1 uppercase font-medium tracking-wider">ID: {item.no}</div>}
              </td>
              <td className="py-4 px-6 text-sm text-gray-600 text-right font-medium border-r border-gray-200">{Number(item.quantity)}</td>
              <td className="py-4 px-6 text-sm text-gray-500 text-right font-mono tracking-tight border-r border-gray-200">{formatCurrency(Number(item.unitPrice))}</td>
              <td className="py-4 px-6 text-sm font-bold text-gray-900 text-right font-mono tracking-tight">{formatCurrency(Number(item.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function calculateSectionTotal(section: any) {
  let sectionTotal = 0;
  if (section.items) {
    section.items.forEach((item: any) => {
      sectionTotal += Number(item.amount || 0);
    });
  }
  if (section.groups) {
    section.groups.forEach((group: any) => {
      if (group.items) {
        group.items.forEach((item: any) => {
          sectionTotal += Number(item.amount || 0);
        });
      }
    });
  }
  if (section.categoryGroups) {
    section.categoryGroups.forEach((categoryGroup: any) => {
      if (categoryGroup.items) {
        categoryGroup.items.forEach((item: any) => {
          sectionTotal += Number(item.amount || 0);
        });
      }
    });
  }
  const discountValue = section.discount ? Number(section.discount) : 0;
  return Math.max(0, sectionTotal - discountValue);
}
