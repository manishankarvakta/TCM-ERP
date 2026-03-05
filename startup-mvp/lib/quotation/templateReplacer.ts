export function replaceQuotationTemplates(text: string | null | undefined, quotation: any): string {
  if (!text) return '';

  let clientName = quotation?.client?.company || '';
  let contactPerson = quotation?.client?.firstName ? `${quotation.client.firstName} ${quotation.client.lastName || ''}`.trim() : '';
  let projectName = quotation?.subject || '';
  let companyName = quotation?.organization?.name || '';
  let submittedBy = quotation?.submittedBy?.name || '';
  let date = quotation?.date ? new Date(quotation.date).toLocaleDateString() : new Date().toLocaleDateString();

  // Extract from section metadata if possible (overrides basic DB fields)
  if (quotation?.section && Array.isArray(quotation.section)) {
    const clientInfoSec = quotation.section.find((s: any) => s.type === 'CLIENT_INFO');
    if (clientInfoSec?.metadata?.clientInfo) {
      const ci = clientInfoSec.metadata.clientInfo;
      if (ci.companyName) clientName = ci.companyName;
      if (ci.contactPerson) contactPerson = ci.contactPerson;
    }
    const coverSec = quotation.section.find((s: any) => s.type === 'COVER');
    if (coverSec?.metadata?.cover) {
      if (coverSec.metadata.cover.subject) projectName = coverSec.metadata.cover.subject;
    }
  }

  // Fallbacks if one is missing but the other exists
  if (!clientName && contactPerson) clientName = contactPerson;
  if (!contactPerson && clientName) contactPerson = clientName;

  return text
    .replace(/\{\{clientName\}\}/gi, clientName || 'Client')
    .replace(/\{\{contactPerson\}\}/gi, contactPerson || 'Client Contact')
    .replace(/\{\{projectName\}\}/gi, projectName || 'Project')
    .replace(/\{\{companyName\}\}/gi, companyName || 'Our Company')
    .replace(/\{\{yourCompany\}\}/gi, companyName || 'Our Company')
    .replace(/\{\{submittedBy\}\}/gi, submittedBy || 'Representative')
    .replace(/\{\{date\}\}/gi, date);
}
