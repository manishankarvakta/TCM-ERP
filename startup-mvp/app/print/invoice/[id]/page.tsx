import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import ReceiptBarcode from "./ReceiptBarcode";


export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const [sale, posSettingsRaw] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: true,
        createdByUser: true,
        warehouse: true,
        items: {
          include: {
            item: true,
          }
        }
      }
    }),
    prisma.settings.findFirst({
      where: {
        code: "pos_settings",
        userId: null,
        isGlobal: true,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  ]);

  if (!sale) {
    return notFound();
  }

  let previousDue = 0;
  if (sale.clientId) {
    const previousSales = await prisma.sale.findMany({
      where: {
        clientId: sale.clientId,
        status: "COMPLETED",
        isTrash: false,
        id: { not: sale.id },
        createdAt: { lte: sale.createdAt },
      },
    });

    for (const pSale of previousSales) {
      const pGrandTotal = pSale.grandTotal.toNumber();
      const pDetails = pSale.paymentDetails as any;

      let pInitialPaid = 0;
      let pTotalCollected = 0;

      if (pDetails) {
        pInitialPaid = Number(pDetails.cashAmount || 0) + Number(pDetails.cardAmount || 0) + Number(pDetails.mfsAmount || 0) - Number(pDetails.changeAmount || 0);

        if (Array.isArray(pDetails.dueCollections)) {
          for (const col of pDetails.dueCollections) {
            pTotalCollected += Number(col.cashAmount || 0) + Number(col.cardAmount || 0) + Number(col.mfsAmount || 0);
          }
        }
      }

      const pRemainingDue = Number((pGrandTotal - pInitialPaid - pTotalCollected).toFixed(2));
      if (pRemainingDue > 0.01) {
        previousDue += pRemainingDue;
      }
    }
  }

  const posSettings = posSettingsRaw?.settings
    ? (posSettingsRaw.settings as any)
    : {
        paperSize: "80mm",
        showHeaderLogo: false,
        headerText: "Ferrari Fashion",
        subHeaderText: "BIN 004601696-0102 | Mushak 6.3",
        footerText: "Thank you for shopping with us!",
        showBiller: true,
        showTaxDetails: true,
      };

  const isReturn = sale.grandTotal.toNumber() < 0;

  const totalItems = sale.items.length;
  const totalQty = sale.items.reduce((sum, item) => sum + Math.abs(item.quantity.toNumber()), 0);

  const returnedSubtotal = sale.items
    .filter((i) => i.isReturnItem || i.quantity.toNumber() < 0)
    .reduce((sum, i) => sum + Math.abs(i.amount.toNumber()), 0);

  const newSubtotal = sale.items
    .filter((i) => !i.isReturnItem && i.quantity.toNumber() > 0)
    .reduce((sum, i) => sum + Math.abs(i.amount.toNumber()), 0);

  const sortedPrintItems = [...sale.items].sort((a, b) => {
    const isAReturn = a.isReturnItem || a.quantity.toNumber() < 0;
    const isBReturn = b.isReturnItem || b.quantity.toNumber() < 0;
    if (isAReturn && !isBReturn) return -1;
    if (!isAReturn && isBReturn) return 1;
    return 0;
  });

  const paperSize = posSettings.paperSize || "80mm";
  const widthClass = 
    paperSize === "58mm" 
      ? "max-w-[240px]" 
      : paperSize === "A4" 
      ? "max-w-4xl px-12" 
      : "max-w-[380px]"; // 80mm

  return (
    <div className={`bg-white text-black min-h-screen p-6 text-xs mx-auto font-sans relative ${widthClass}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        /* Force light mode styles on print view page to prevent white text on white page */
        html.dark, .dark body, .dark div.bg-white, .dark text-black, .dark span, .dark td, .dark th, .dark table {
          color: black !important;
          background-color: white !important;
          border-color: #000000 !important;
        }
        .dark .border-black {
          border-color: #000000 !important;
        }
      ` }} />

      <PrintButton />
      
      {posSettings.showHeaderLogo && posSettings.logoUrl && (
        <div className="flex justify-center mb-3 print:mb-2">
          <img
            src={posSettings.logoUrl}
            alt="Logo"
            className="max-h-12 object-contain"
          />
        </div>
      )}

      <div className="text-center mb-6">
        <h1 className="text-lg font-bold uppercase">{posSettings.headerText || "Ferrari Fashion"}</h1>
        {posSettings.subHeaderText && <p className="text-[10px] text-gray-600">{posSettings.subHeaderText}</p>}
        <p className="font-bold mt-1 text-xs">
          {sale.orderType === "EXCHANGE" ? "Exchange Invoice No:" : isReturn ? "Return Invoice No:" : "Invoice No:"} {sale.saleNumber}
        </p>
      </div>

      <div className="grid grid-cols-2 text-[10px] mb-4">
        <div>
          <p>Phone: {sale.client?.phone || "N/A"}</p>
          <p>Customer: {sale.client?.name || "Walk-in Customer"}</p>
          {posSettings.showBiller && <p>Biller: {sale.createdByUser?.name || "System"}</p>}
        </div>
        <div className="text-right">
          <p>Date: {sale.createdAt.toLocaleDateString()}</p>
          <p>Time: {sale.createdAt.toLocaleTimeString()}</p>
          <p>Outlet: {sale.warehouse?.name || posSettings.headerText || "Ferrari Fashion"}</p>
        </div>
      </div>

      <div className="text-center font-bold border-y border-dashed border-black py-1 mb-2">
        {sale.orderType === "EXCHANGE" ? "EXCHANGE DETAILS" : isReturn ? "RETURN DETAILS" : "ORDER DETAILS"}
      </div>

      <table className="w-full text-[10px] mb-4">
        <thead>
          <tr className="border-b border-dashed border-black text-left">
            <th className="py-1">SL</th>
            <th>Item</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody className="border-b border-dashed border-black">
          {sortedPrintItems.length === 0 && (
            <tr>
              <td colSpan={5} className="py-2 text-center">No Product in Purchase cart</td>
            </tr>
          )}
          {sortedPrintItems.map((item, index) => {
            const isItemReturn = item.isReturnItem || item.quantity.toNumber() < 0 || item.amount.toNumber() < 0;
            const itemQty = isItemReturn ? -Math.abs(item.quantity.toNumber()) : Math.abs(item.quantity.toNumber());
            const itemTotal = isItemReturn ? -Math.abs(item.amount.toNumber()) : Math.abs(item.amount.toNumber());
            const prefixTag = isItemReturn ? "(RET) " : sale.orderType === "EXCHANGE" ? "(NEW) " : "";
            
            return (
              <tr key={item.id} className={isItemReturn ? "font-semibold" : ""}>
                <td className="py-1 align-top">{index + 1}</td>
                <td className="align-top">
                  {prefixTag}{item.description || item.item?.name}
                </td>
                <td className="text-center align-top">{itemQty}</td>
                <td className="text-right align-top">{item.unitPrice.toNumber().toFixed(2)}</td>
                <td className="text-right align-top">{itemTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="space-y-1 text-[10px] border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>Total Item: {totalItems}</span>
          <span>Total Qty: {totalQty}</span>
        </div>
        {sale.orderType === "EXCHANGE" ? (
          <>
            <div className="flex justify-between font-semibold">
              <span>Returned Subtotal:</span>
              <span>-{returnedSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>New Items Subtotal:</span>
              <span>+{newSubtotal.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>Total:</span>
            <span>{Math.abs(sale.subTotal.toNumber()).toFixed(2)}</span>
          </div>
        )}
        {sale.discount && sale.discount.toNumber() !== 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>{sale.discount.toNumber().toFixed(2)}</span>
          </div>
        )}
        {posSettings.showTaxDetails && sale.tax && sale.tax.toNumber() !== 0 && (
          <div className="flex justify-between">
            <span>VAT:</span>
            <span>{sale.tax.toNumber().toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t border-black border-dashed pt-1 mt-1">
          <span>Net Amount:</span>
          <span className="border border-black px-1">{sale.grandTotal.toNumber().toFixed(2)}</span>
        </div>

        {/* Payment splits and return details */}
        {isReturn ? (
          <div className="flex justify-between font-bold border-t border-black border-dashed pt-1 mt-1">
            <span>Returned Amount:</span>
            <span>{Math.abs(sale.grandTotal.toNumber()).toFixed(2)}</span>
          </div>
        ) : (
          (() => {
            const details = sale.paymentDetails as any;
            const cash = details ? Number(details.cashAmount || 0) : (sale.grandTotal.toNumber() > 0 ? sale.grandTotal.toNumber() : 0);
            const card = details ? Number(details.cardAmount || 0) : 0;
            const mfs = details ? Number(details.mfsAmount || 0) : 0;
            const totalPaid = cash + card + mfs;
            const due = Number((sale.grandTotal.toNumber() - totalPaid).toFixed(2));
            const change = Number((totalPaid - sale.grandTotal.toNumber()).toFixed(2));

            return (
              <div className="border-t border-dashed border-black pt-1 mt-1 space-y-1">
                {cash > 0 && (
                  <div className="flex justify-between">
                    <span>{change > 0.01 ? "Cash Received:" : "Paid Cash:"}</span>
                    <span>{cash.toFixed(2)}</span>
                  </div>
                )}
                {card > 0 && (
                  <div className="flex justify-between">
                    <span>Paid Card:</span>
                    <span>{card.toFixed(2)}</span>
                  </div>
                )}
                {mfs > 0 && (
                  <div className="flex justify-between">
                    <span>Paid MFS:</span>
                    <span>{mfs.toFixed(2)}</span>
                  </div>
                )}
                {due > 0.01 && (
                  <div className="flex justify-between font-semibold">
                    <span>Due Amount:</span>
                    <span>{due.toFixed(2)}</span>
                  </div>
                )}
                {change > 0.01 && (
                  <div className="flex justify-between font-semibold">
                    <span>Change Amount:</span>
                    <span>{change.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-dashed border-black pt-1 mt-1">
                  <span>Previous Due:</span>
                  <span>{previousDue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-[11px]">
                  <span>Total Due:</span>
                  <span>{(previousDue + (due > 0 ? due : 0)).toFixed(2)}</span>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {posSettings.footerText && (
        <div className="text-center text-[10px] text-gray-500 border-t border-dashed border-black pt-2 whitespace-pre-line mt-4">
          {posSettings.footerText}
        </div>
      )}

      {posSettings.showBarcode && (
        <ReceiptBarcode value={sale.saleNumber} />
      )}
    </div>
  );
}
