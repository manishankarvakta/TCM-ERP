import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import ReceiptBarcode from "./ReceiptBarcode";
import { computeSaleDueAmount } from "@/lib/sales-utils";


export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const [sale, posSettingsRaw, membershipSettingsRaw] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: {
          include: {
            ChartOfAccount: true,
          },
        },
        createdByUser: true,
        permittedByUser: true,
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
    }),
    prisma.settings.findFirst({
      where: {
        code: "membership_settings",
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
    // 1. Include client's initial opening balance if not already in posted journal
    const openingBal = Number(sale.client?.openingBalance || 0);
    const coaId = (sale.client as any)?.ChartOfAccount?.id;
    let hasOpeningJournal = false;
    if (coaId) {
      const journalMatch = await prisma.journalEntryLine.findFirst({
        where: {
          chartOfAccountId: coaId,
          description: { contains: "opening balance", mode: "insensitive" },
        },
      });
      if (journalMatch) hasOpeningJournal = true;
    }

    if (openingBal > 0 && !hasOpeningJournal) {
      previousDue += openingBal;
    }

    // 2. Add remaining dues from all previous completed sales
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

    // 3. Subtract any standalone RECEIPT vouchers for this client before this sale (excluding vouchers linked/referenced to sales)
    const standaloneReceipts = await prisma.voucher.findMany({
      where: {
        clientId: sale.clientId,
        type: "RECEIPT",
        status: "posted",
        createdAt: { lte: sale.createdAt },
        sales: { none: {} },
        AND: [
          { reference: { not: { startsWith: "SAL-" } } },
          { reference: { not: { startsWith: "EXC-" } } },
          { reference: { not: { startsWith: "RET-" } } },
        ],
      },
      include: {
        VoucherLine: true,
      },
    });

    for (const vReceipt of standaloneReceipts) {
      const vAmount = vReceipt.VoucherLine.reduce(
        (sum, line) => sum + Number(line.creditAmount || 0),
        0
      );
      previousDue = Math.max(0, previousDue - vAmount);
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

  const membershipSettings = membershipSettingsRaw?.settings as any;
  const pointsSpentRatio = Number(membershipSettings?.pointsSpentRatio) > 0 ? Number(membershipSettings.pointsSpentRatio) : 100;
  
  const paymentDetails = sale.paymentDetails as any;
  let cardAccountName = "Card";
  let mfsAccountName = "MFS";
  let cashAccountName = "Cash";

  const accountIdsToFetch = [paymentDetails?.cardAccountId, paymentDetails?.mfsAccountId, paymentDetails?.cashAccountId].filter(Boolean);
  if (accountIdsToFetch.length > 0) {
    const coas = await prisma.chartOfAccount.findMany({
      where: { id: { in: accountIdsToFetch } },
      select: { id: true, name: true },
    });
    const coaMap = new Map(coas.map(c => [c.id, c.name]));
    if (paymentDetails?.cardAccountId && coaMap.has(paymentDetails.cardAccountId)) {
      cardAccountName = coaMap.get(paymentDetails.cardAccountId)!;
    }
    if (paymentDetails?.mfsAccountId && coaMap.has(paymentDetails.mfsAccountId)) {
      mfsAccountName = coaMap.get(paymentDetails.mfsAccountId)!;
    }
    if (paymentDetails?.cashAccountId && coaMap.has(paymentDetails.cashAccountId)) {
      cashAccountName = coaMap.get(paymentDetails.cashAccountId)!;
    }
  }

  const pointsRedeemed = Number(paymentDetails?.pointsRedeemed || 0);
  const earnedPoints = (sale.client?.membershipStatus === "ACTIVE" || sale.client?.membershipStatus) && sale.grandTotal.toNumber() > 0 
    ? Math.floor(sale.grandTotal.toNumber() / pointsSpentRatio) 
    : 0;
  const currentTotalPoints = Number(sale.client?.membershipPoints || 0);
  const previousPoints = Math.max(0, currentTotalPoints - earnedPoints + pointsRedeemed);
  const newPoints = previousPoints + earnedPoints;

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

  const currentSaleDue = computeSaleDueAmount({
    grandTotal: sale.grandTotal,
    status: sale.status,
    paymentDetails: sale.paymentDetails,
  });
  const isDueSale = currentSaleDue > 0.01;

  const paperSize = posSettings.paperSize || "80mm";
  const widthClass = 
    paperSize === "58mm" 
      ? "max-w-[240px]" 
      : paperSize === "A4" 
      ? "max-w-4xl px-12" 
      : "max-w-[380px]"; // 80mm

  return (
    <div className={`bg-white text-black print-light-schema min-h-screen p-6 text-xs mx-auto font-sans relative ${widthClass}`} data-print-light="true">
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
              <div className="relative border-t border-dashed border-black pt-1 mt-1 space-y-1">
                {isDueSale && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center z-0 select-none overflow-visible"
                    style={{ opacity: 0.18 }}
                    aria-hidden="true"
                  >
                    <img
                      src="/Payment-due.svg"
                      alt="Payment Due"
                      className="w-4/5 max-w-[210px] object-contain transform -rotate-12"
                    />
                  </div>
                )}
                {cash > 0 && (
                  <div className="relative z-10 flex justify-between">
                    <span>{change > 0.01 ? `${cashAccountName} Received:` : `Paid ${cashAccountName}:`}</span>
                    <span>{cash.toFixed(2)}</span>
                  </div>
                )}
                {card > 0 && (
                  <div className="relative z-10 flex justify-between">
                    <span>Paid {cardAccountName}:</span>
                    <span>{card.toFixed(2)}</span>
                  </div>
                )}
                {mfs > 0 && (
                  <div className="relative z-10 flex justify-between">
                    <span>Paid {mfsAccountName}:</span>
                    <span>{mfs.toFixed(2)}</span>
                  </div>
                )}
                {due > 0.01 && (
                  <div className="relative z-10 flex justify-between font-semibold">
                    <span>Due Amount:</span>
                    <span>{due.toFixed(2)}</span>
                  </div>
                )}
                {change > 0.01 && (
                  <div className="relative z-10 flex justify-between font-semibold">
                    <span>Change Amount:</span>
                    <span>{change.toFixed(2)}</span>
                  </div>
                )}
                <div className="relative z-10 flex justify-between font-semibold border-t border-dashed border-black pt-1 mt-1">
                  <span>Previous Due:</span>
                  <span>{previousDue.toFixed(2)}</span>
                </div>
                <div className="relative z-10 flex justify-between font-bold text-[11px]">
                  <span>Total Due:</span>
                  <span>{(previousDue + (due > 0 ? due : 0)).toFixed(2)}</span>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Customer Points Summary (3 lines before Return Policy) */}
      {posSettings.showCustomerPoints && (
        <div className="space-y-1 text-[10px] border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between">
            <span>Previous Point:</span>
            <span>{previousPoints}</span>
          </div>
          <div className="flex justify-between">
            <span>Earned Point:</span>
            <span>{earnedPoints}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>New Point:</span>
            <span>{newPoints}</span>
          </div>
        </div>
      )}

      {posSettings.footerText && (
        <div 
          className="text-left text-[10px] text-gray-500 border-t border-dashed border-black pt-2 mt-4 [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
          dangerouslySetInnerHTML={{ __html: posSettings.footerText }}
        />
      )}

      {posSettings.showBarcode && (
        <ReceiptBarcode value={sale.saleNumber} />
      )}
    </div>
  );
}
