/* eslint-disable @next/next/no-img-element */
import { formatDate } from "@/lib/utils/formatters";

interface PrintableChallanProps {
  delivery?: any;
  schedule?: any;
  organization?: any;
}

export default function PrintableChallan({ delivery, schedule, organization }: PrintableChallanProps) {
  const orgName = organization?.name || "Espacio";
  const orgAddress = organization?.address || "Dhaka, Bangladesh";
  const orgPhone = organization?.phone || "";
  const orgEmail = organization?.email || "";
  const orgLogo = organization?.logo || null;

  // Normalize data source
  const data = schedule || delivery;
  const isSchedule = !!schedule;
  
  if (!data) return null;

  const id = isSchedule ? data.id : data.id;
  const date = isSchedule ? data.scheduledDate : data.date;
  const orderNumber = data.order.orderNumber;
  const client = data.order.client;
  const description = data.description;

  // Normalize items
  const items = isSchedule 
    ? data.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        sku: item.orderItem?.quotationItem?.item?.code || "", // Schedule items might not have deep nesting yet, handle gracefully
        unit: "Pcs" 
      }))
    : [{
        description: data.orderItem.description,
        quantity: data.quantity,
        sku: data.orderItem.quotationItem?.item?.code || "",
        unit: "Pcs"
      }];

  return (
    <div id="printable-content" className="p-12 hidden print:block text-black font-sans bg-white h-full mx-auto max-w-[210mm]">
      {/* Header Section - Clean & Minimal */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex gap-6 items-center">
             {orgLogo && (
                 <img src={orgLogo} alt="Logo" className="w-16 h-16 object-contain" />
             )}
            <div>
               <h1 className="text-2xl font-bold uppercase tracking-tight text-black mb-1">{orgName}</h1>
               <div className="text-sm text-gray-600 space-y-0.5">
                 <p className="whitespace-pre-wrap max-w-xs leading-snug">{orgAddress}</p>
                 {orgPhone && <p>Tel: {orgPhone}</p>}
                 {orgEmail && <p>Email: {orgEmail}</p>}
               </div>
            </div>
        </div>
        
        <div className="text-right">
             <h2 className="text-3xl font-light uppercase tracking-widest text-gray-400 mb-4">Delivery Challan</h2>
             <div className="text-sm text-gray-900 space-y-1">
                 <p><span className="font-semibold w-24 inline-block">Challan No:</span> {id.slice(-8).toUpperCase()}</p>
                 <p><span className="font-semibold w-24 inline-block">Date:</span> {formatDate(date)}</p>
                 <p><span className="font-semibold w-24 inline-block">Order Ref:</span> {orderNumber}</p>
             </div>
        </div>
      </div>

      {/* Recipient & Shipping Info - Simple Columns */}
      <div className="flex mb-16 gap-12">
        <div className="flex-1">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 border-b border-gray-200 pb-1 w-full">Ship To</h3>
            <div className="text-sm text-gray-900 leading-relaxed">
                <p className="font-bold text-base">{client?.company || client?.name}</p>
                {client?.company && <p>{client?.name}</p>}
                <p className="text-gray-600 whitespace-pre-wrap mt-1">{client?.address || "No address provided"}</p>
                <p className="text-gray-600 mt-1">{client?.phone}</p>
            </div>
        </div>
        
        <div className="flex-1">
            {description && (
                <>
                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 border-b border-gray-200 pb-1 w-full">Note</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
                </>
            )}
        </div>
      </div>

      {/* Items Table - Minimalist */}
      <div className="mb-12">
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="border-b-2 border-black">
                    <th className="py-2 text-left font-bold text-black w-16">SL</th>
                    <th className="py-2 text-left font-bold text-black">Description</th>
                    <th className="py-2 text-right font-bold text-black w-32">Qty</th>
                    <th className="py-2 text-right font-bold text-black w-24">Unit</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                        <td className="py-4 align-top text-gray-500">{String(index + 1).padStart(2, '0')}</td>
                        <td className="py-4 align-top text-gray-900">
                            <p className="font-semibold text-base">{item.description}</p>
                            {item.sku && <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>}
                        </td>
                        <td className="py-4 align-top text-right font-medium text-lg">{Number(item.quantity)}</td>
                        <td className="py-4 align-top text-right text-gray-500">{item.unit}</td> 
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Footer / Signatures - Standard Layout */}
      <div className="mt-auto pt-20">
        <div className="flex justify-between items-end pb-4">
            <div className="text-center">
                <div className="w-48 border-t border-black pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider">Receiver's Signature</p>
                </div>
            </div>
            
             <div className="text-center">
                <div className="w-48 border-t border-black pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider">Authorized Signature</p>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
}
