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
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <Link href="/dashboard/quotations">
            <Button variant="ghost" className="hover:bg-white text-gray-600">
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

        {/* PROPOSAL DOCUMENT CONTAINER */}
        <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-2xl overflow-hidden border border-gray-100">
          
          {/* 1. COVER SECTION */}
          <div className="relative bg-[#0A2540] text-white p-12 md:p-20 overflow-hidden min-h-[500px] flex flex-col justify-between">
            {/* Mesh Surface Graphic Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
               <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0 100 C 20 0 50 0 100 100 Z" fill="rgba(255,255,255,0.05)" />
                 <path d="M0 100 C 50 50 80 50 100 0 Z" fill="rgba(255,255,255,0.03)" />
               </svg>
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
               {/* Animated-style grid */}
               <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="relative z-10 flex justify-between items-start mb-20">
              {/* Organization/Client Logos Side-by-Side */}
              <div className="flex items-center gap-8">
                {quotation.organization?.logo && (
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20">
                    <img src={quotation.organization.logo} alt="Org Logo" className="h-10 w-auto object-contain brightness-0 invert" />
                  </div>
                )}
                {quotation.client?.image && (
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20">
                    <img src={quotation.client.image} alt="Client Logo" className="h-10 w-auto object-contain brightness-0 invert" />
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium tracking-widest text-white/50 uppercase">REF / {quotation.quotationNumber}</p>
                <div className="mt-2 text-3xl font-bold tracking-tight">{formatDate(quotation.date)}</div>
              </div>
            </div>

            <div className="relative z-10">
              <div className="h-1 w-24 bg-blue-500 mb-8" />
              <h1 className="text-5xl md:text-7xl font-bold leading-tight max-w-2xl text-white">
                Software Development Proposal
              </h1>
              <p className="mt-6 text-xl text-blue-100 font-medium tracking-wide">
                {quotation.subject}
              </p>
            </div>

            <div className="relative z-10 mt-20 flex flex-wrap gap-12 border-t border-white/10 pt-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Prepared For</p>
                <p className="text-lg font-bold">{quotation.client?.name || quotation.client?.company || 'N/A'}</p>
                <p className="text-sm text-white/60">{quotation.client?.company}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Prepared By</p>
                <p className="text-lg font-bold">{quotation.submittedBy?.name || 'Authorized Representative'}</p>
                <p className="text-sm text-white/60">{quotation.organization?.name || 'Our Organization'}</p>
              </div>
            </div>
          </div>

          {/* 2. COVER LETTER SECTION */}
          {(quotation.coverLetter || (quotation as any).financialStatement) && (
            <div className="p-12 md:p-20 border-b border-gray-100">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-8">Introduction</h2>
                {quotation.coverLetter && (
                  <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed mb-12 shrink-0 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: quotation.coverLetter }} />
                )}
                
                {/* Embedded Financial Summary if it exists */}
                {(quotation as any).financialStatement && (
                   <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                     <h3 className="text-lg font-bold text-[#0A2540] mb-6">Financial Investment Summary</h3>
                     <div dangerouslySetInnerHTML={{ __html: (quotation as any).financialStatement }} className="text-sm text-gray-600" />
                   </div>
                )}
              </div>
            </div>
          )}

          {/* 3. DYNAMIC PRICING SECTIONS */}
          {quotation.section && quotation.section.length > 0 && (
            <div className="space-y-0">
              {quotation.section.map((section: any, sectionIndex: number) => {
                const discountValue = section.discount ? Number(section.discount) : null;
                
                return (
                  <div key={section.id || sectionIndex} className="p-12 md:p-20 border-b border-gray-100 last:border-b-0">
                    <div className="mb-10">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 block">Section {sectionIndex + 1}</span>
                          <h2 className="text-3xl font-bold text-[#0A2540]">{section.title}</h2>
                        </div>
                        {discountValue != null && discountValue > 0 && (
                          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter block">Section Discount</span>
                            <span className="text-lg font-bold text-blue-700">Tk {formatCurrency(discountValue)}</span>
                          </div>
                        )}
                      </div>
                      {section.note && (
                        <p className="text-gray-500 mt-4 max-w-2xl">{section.note}</p>
                      )}
                    </div>

                    <div className="space-y-12">
                      {/* Groups Rendering */}
                      {section.groups && section.groups.length > 0 && (
                        <div className="space-y-10">
                          {section.groups.map((group: any, groupIndex: number) => (
                            <div key={group.id || groupIndex}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="h-6 w-1 bg-blue-500 rounded-full" />
                                <h4 className="text-xl font-bold text-[#0A2540]">
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
                        <div className="space-y-10">
                          {section.categoryGroups.map((catGroup: any, idx: number) => (
                            <div key={catGroup.id || idx}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="h-6 w-1 bg-blue-500 rounded-full" />
                                <h4 className="text-xl font-bold text-[#0A2540]">
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

                    {/* Section Subtotal - Only for PRICING type sections */}
                    {section.sectionType === 'PRICING' && (
                      <div className="mt-12 flex justify-end">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 min-w-[240px] text-right">
                           <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Section Investment</p>
                           <p className="text-2xl font-black text-[#0A2540]">{formatCurrency(calculateSectionTotal(section))}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. GRAND TOTAL SECTION */}
          <div className="bg-[#0A2540] p-12 md:p-20 text-white flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-white">Final Project Investment</h2>
              <p className="text-white/60">This includes all specified phases and deliverables mentioned above.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 text-right min-w-[300px]">
              <p className="text-sm font-bold text-blue-300 uppercase tracking-widest mb-2">Grand Total</p>
              <p className="text-5xl font-black text-white">{formatCurrency(Number(quotation.total))}</p>
              <div className="mt-4 flex items-center justify-end gap-2 text-blue-200 text-sm italic">
                <span>Inclusive of all taxes as per agreement</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Helper for Terms & Conditions or Footer */}
        {quotation.tos && (
          <div className="mt-12 max-w-3xl mx-auto text-center px-4">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Terms & Conditions</h3>
             <div className="text-xs text-gray-400 leading-relaxed text-left max-h-40 overflow-y-auto p-6 bg-white rounded-xl border border-gray-100" dangerouslySetInnerHTML={{ __html: quotation.tos }} />
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
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-widest">SL</th>
            <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
            <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Qty</th>
            <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
            <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item, idx) => (
            <tr key={item.id || idx} className="group hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-2 text-sm text-gray-500 font-medium">{item.sl || idx + 1}</td>
              <td className="py-4 px-2">
                <div className="text-sm font-bold text-[#0A2540]">{item.code && <span className="text-blue-600 mr-2">[{item.code}]</span>}{item.description}</div>
                {item.no && <div className="text-[10px] text-gray-400 mt-1 uppercase">ID: {item.no}</div>}
              </td>
              <td className="py-4 px-2 text-sm text-gray-600 text-right">{Number(item.quantity)}</td>
              <td className="py-4 px-2 text-sm text-gray-600 text-right font-mono">{formatCurrency(Number(item.unitPrice))}</td>
              <td className="py-4 px-2 text-sm font-bold text-[#0A2540] text-right font-mono">{formatCurrency(Number(item.amount))}</td>
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
