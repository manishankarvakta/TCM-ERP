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

        {/* PROPOSAL DOCUMENT CONTAINER */}
        <div className="bg-white shadow-2xl shadow-blue-900/5 rounded-3xl overflow-hidden border border-gray-100/80 ring-1 ring-gray-900/5 relative">
          
          {/* 1. COVER SECTION */}
          <div className="relative bg-gradient-to-br from-[#091523] via-[#0A2540] to-[#173354] text-white p-12 md:p-24 overflow-hidden min-h-[600px] flex flex-col justify-between">
            {/* Premium Mesh Surface Graphic Background */}
            <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
               <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
               <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
               <svg className="absolute w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
                 <path d="M0 100 C 50 50 80 50 100 0 Z" fill="url(#grad2)" />
                 <defs>
                   <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                     <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                   </linearGradient>
                   <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                     <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                   </linearGradient>
                 </defs>
               </svg>
               {/* Animated-style grid */}
               <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
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

            <div className="relative z-10 mt-24 flex flex-wrap gap-16 border-t border-white/10 pt-12">
              <div className="group">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300/60 mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-blue-300/40"></span> Prepared For
                </p>
                <p className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">{quotation.client?.name || quotation.client?.company || 'N/A'}</p>
                <p className="text-sm text-blue-100/60 mt-1">{quotation.client?.company}</p>
              </div>
              <div className="group">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300/60 mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-blue-300/40"></span> Prepared By
                </p>
                <p className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">{quotation.submittedBy?.name || 'Authorized Representative'}</p>
                <p className="text-sm text-blue-100/60 mt-1">{quotation.organization?.name || 'Our Organization'}</p>
              </div>
            </div>
          </div>

          {/* 2. COVER LETTER SECTION — shown only when there is no dynamic COVER/COVER_LETTER section */}
          {!hasDynamicCover && (quotation.coverLetter || (quotation as any).financialStatement) && (
            <div className="p-12 md:p-20 border-b border-gray-100">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-8">Introduction</h2>
                {quotation.coverLetter && (
                  <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed mb-12 shrink-0 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: replaceQuotationTemplates(quotation.coverLetter, quotation) }} />
                )}
                
                {/* Embedded Financial Summary if it exists */}
                {(quotation as any).financialStatement && (
                   <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                     <h3 className="text-lg font-bold text-[#0A2540] mb-6">Financial Investment Summary</h3>
                     <div dangerouslySetInnerHTML={{ __html: replaceQuotationTemplates((quotation as any).financialStatement, quotation) }} className="text-sm text-gray-600" />
                   </div>
                )}
              </div>
            </div>
          )}

          {/* 3. DYNAMIC PRICING SECTIONS */}
          {quotation.section && quotation.section.length > 0 && (
            <div className="space-y-0">
              {quotation.section
                .filter((section: any) => section.isEnabled !== false)
                .map((section: any, index: number) => {
                const discountValue = section.discount ? Number(section.discount) : null;
                const sectionIndex = index; // Keep 0-indexed for display logic if needed
                
                return (
                  <div key={section.id || sectionIndex} className="p-12 md:p-20 border-b border-gray-100 last:border-b-0 print:break-inside-avoid print:p-8">
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
                        <p className="text-gray-500 mt-4 max-w-2xl leading-relaxed">{section.note}</p>
                      )}
                    </div>

                    {/* Unified Section Content Renderer (Metadata-driven) */}
                    <SectionViewRenderer section={section} quotation={quotation} />

                    {/* Render items/groups tables ONLY for PRICING-type sections */}
                    {(section.sectionType === 'PRICING' || !section.sectionType) && (
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
                    )}

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
          <div className="bg-gradient-to-r from-[#091523] to-[#0A2540] p-12 md:p-24 text-white flex flex-col md:flex-row justify-between items-center gap-12 relative overflow-hidden">
             {/* Decorative glow */}
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full translate-x-1/4 -translate-y-1/4" />
             <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
             
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">Final Project Investment</h2>
              <p className="text-blue-100/70 text-lg max-w-md leading-relaxed">This includes all specified phases and deliverables mentioned above.</p>
            </div>
            <div className="relative z-10 bg-white/5 backdrop-blur-2xl p-10 rounded-[2rem] border border-white/10 shadow-2xl text-right min-w-[340px] transform hover:scale-105 transition-all duration-500 ring-1 ring-white/20">
              <p className="text-xs font-bold text-blue-300 uppercase tracking-[0.2em] mb-4">Grand Total</p>
              <p className="text-3xl md:text-3xl font-black text-white tracking-tighter">{formatCurrency(Number(quotation.grandTotal || quotation.total))}</p>
              <div className="mt-8 flex items-center justify-end gap-2 text-blue-200 text-xs font-medium uppercase tracking-widest">
                <span className="bg-blue-500/20 px-4 py-2 rounded-full border border-blue-400/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Inclusive of all taxes
                </span>
              </div>
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
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm mt-4 print:break-inside-avoid">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="py-5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest">SL</th>
            <th className="py-5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Description</th>
            <th className="py-5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Qty</th>
            <th className="py-5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Unit Price</th>
            <th className="py-5 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item, idx) => (
            <tr key={item.id || idx} className="group hover:bg-blue-50/30 transition-all duration-300 print:break-inside-avoid">
              <td className="py-5 px-6 text-sm text-gray-400 font-semibold">{item.sl || idx + 1}</td>
              <td className="py-5 px-6">
                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.code && <span className="text-blue-500 mr-2 opacity-80">[{item.code}]</span>}{item.description}</div>
                {item.no && <div className="text-[10px] text-gray-400 mt-1.5 uppercase font-medium tracking-wider">ID: {item.no}</div>}
              </td>
              <td className="py-5 px-6 text-sm text-gray-600 text-right font-medium">{Number(item.quantity)}</td>
              <td className="py-5 px-6 text-sm text-gray-500 text-right font-mono tracking-tight">{formatCurrency(Number(item.unitPrice))}</td>
              <td className="py-5 px-6 text-sm font-bold text-gray-900 text-right font-mono tracking-tight">{formatCurrency(Number(item.amount))}</td>
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
