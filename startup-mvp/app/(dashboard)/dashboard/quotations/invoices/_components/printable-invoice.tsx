
import { formatDate, formatCurrency } from "@/lib/utils/formatters";

interface PrintableInvoiceProps {
  invoice: any; 
  organization?: any;
}

export default function PrintableInvoice({ invoice, organization }: PrintableInvoiceProps) {
  // Use organization from props, or fallback to default if not provided
  // If invoice has a linked organization via quotation, it should be passed here.
  
  const orgName = organization?.name || "Espacio";
  const orgAddress = organization?.address || "Dhaka, Bangladesh";
  const orgPhone = organization?.phone || "";
  const orgEmail = organization?.email || "";
  
  return (
    <div id="printable-content" className="p-8 hidden print:block text-black">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-2 text-primary">{orgName}</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="whitespace-pre-wrap max-w-xs">{orgAddress}</p>
            {orgPhone && <p>Tel: {orgPhone}</p>}
            {orgEmail && <p>Email: {orgEmail}</p>}
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-light text-gray-800 mb-2">INVOICE</h1>
          <div className="space-y-1 text-sm">
             <p><span className="font-semibold text-gray-600">Invoice #:</span> {invoice.invoiceNumber}</p>
             <p><span className="font-semibold text-gray-600">Date:</span> {formatDate(invoice.date)}</p>
             <p><span className="font-semibold text-gray-600">Ref (Order):</span> {invoice.order.orderNumber}</p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-12">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b pb-1">Bill To</h3>
        <div className="text-sm text-gray-800">
           <p className="font-bold text-lg">{invoice.order.client.company || invoice.order.client.name}</p>
           {invoice.order.client.company && <p>{invoice.order.client.name}</p>}
           <p className="whitespace-pre-wrap max-w-xs mt-1">{invoice.order.client.address || "No address provided"}</p>
           <p className="mt-1">{invoice.order.client.email}</p>
           <p>{invoice.order.client.phone}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 text-left font-bold text-gray-700 w-12">#</th>
              <th className="py-2 text-left font-bold text-gray-700">Description</th>
              <th className="py-2 text-right font-bold text-gray-700 w-24">Quantity</th>
              <th className="py-2 text-right font-bold text-gray-700 w-32">Unit Price</th>
              <th className="py-2 text-right font-bold text-gray-700 w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.items.map((item: any, index: number) => (
              <tr key={item.id}>
                <td className="py-3 text-gray-500">{index + 1}</td>
                <td className="py-3 text-gray-800">{item.orderItem.description}</td>
                <td className="py-3 text-right text-gray-800">{Number(item.quantity)}</td>
                <td className="py-3 text-right text-gray-800">{formatCurrency(Number(item.unitPrice))}</td>
                <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(Number(item.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-16">
        <div className="w-64 space-y-2">
            <div className="flex justify-between border-b pb-2">
                <span className="font-bold">Total</span>
                <span className="font-bold text-xl">{formatCurrency(Number(invoice.totalAmount))}</span>
            </div>
             <p className="text-xs text-right text-gray-500 italic mt-2">All prices are in BDT</p>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="mt-auto pt-8 flex justify-between items-end pb-8">
        <div className="text-xs text-gray-500 max-w-md">
            <p className="font-bold mb-1">Terms & Conditions:</p>
            <p>Payment is due within 15 days.</p>
            <p>Please include the invoice number on your check.</p>
        </div>
        
        <div className="text-center">
            <div className="w-48 border-t border-gray-400 pt-2">
                <p className="text-xs font-semibold text-gray-600">Authorized Signature</p>
            </div>
        </div>
      </div>
    </div>
  );
}
