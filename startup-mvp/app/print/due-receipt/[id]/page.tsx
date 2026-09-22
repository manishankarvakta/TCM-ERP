import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DueReceiptPrintButton from "./DueReceiptPrintButton";

export default async function DueReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const targetId = resolvedParams.id;

  // 1. Fetch Voucher record by ID or Reference or Voucher Number
  const voucher = await prisma.voucher.findFirst({
    where: {
      OR: [
        { id: targetId },
        { reference: targetId },
        { voucherNumber: targetId },
      ],
    },
    include: {
      Client: {
        include: {
          ChartOfAccount: true,
        },
      },
      User_Voucher_createdByToUser: true,
      User_Voucher_postedByIdToUser: true,
      warehouse: true,
      VoucherLine: {
        include: {
          ChartOfAccount: true,
        },
      },
    },
  });

  if (!voucher) {
    return notFound();
  }

  // 2. Fetch POS Settings for headers & styling
  const posSettingsRaw = await prisma.settings.findFirst({
    where: {
      code: "pos_settings",
      userId: null,
      isGlobal: true,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const posSettings = posSettingsRaw?.settings
    ? (posSettingsRaw.settings as any)
    : {
        paperSize: "80mm",
        showHeaderLogo: false,
        headerText: "Ferrari Fashion",
        subHeaderText: "BIN 004601696-0102 | Mushak 6.3",
        footerText: "Thank you for shopping with us!",
        showBiller: true,
      };

  const client = voucher.Client;
  const cashierName = voucher.User_Voucher_createdByToUser?.name || voucher.User_Voucher_postedByIdToUser?.name || "System Cashier";

  // Calculate payment channel breakdown from debit lines
  let cashPaid = 0;
  let cardPaid = 0;
  let mfsPaid = 0;
  let totalPaidInThisTx = 0;

  for (const line of voucher.VoucherLine) {
    const debit = Number(line.debitAmount || 0);
    const credit = Number(line.creditAmount || 0);

    if (debit > 0) {
      const coaName = (line.ChartOfAccount?.name || "").toLowerCase();
      if (coaName.includes("card") || coaName.includes("pos") || coaName.includes("bank")) {
        cardPaid += debit;
      } else if (coaName.includes("bkash") || coaName.includes("nagad") || coaName.includes("mfs") || coaName.includes("rocket") || coaName.includes("upay")) {
        mfsPaid += debit;
      } else {
        cashPaid += debit;
      }
    }

    if (credit > 0) {
      totalPaidInThisTx += credit;
    }
  }

  if (totalPaidInThisTx === 0) {
    totalPaidInThisTx = cashPaid + cardPaid + mfsPaid;
  }

  // 3. Compute client's current net AR balance from journal lines
  let currentRemainingDue = 0;
  if (client) {
    const coaId = client.chartOfAccountId;
    const balanceResult = await prisma.journalEntryLine.aggregate({
      where: {
        OR: [
          ...(coaId ? [{ chartOfAccountId: coaId }] : []),
          { clientId: client.id },
        ],
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const totalDebit = Number(balanceResult._sum.debitAmount || 0);
    const totalCredit = Number(balanceResult._sum.creditAmount || 0);
    let netDue = totalDebit - totalCredit;

    const hasOpeningJournal = await prisma.journalEntryLine.findFirst({
      where: {
        OR: [
          ...(coaId ? [{ chartOfAccountId: coaId }] : []),
          { clientId: client.id },
        ],
        description: { contains: "opening balance", mode: "insensitive" },
      },
    });

    if (Number(client.openingBalance || 0) > 0 && !hasOpeningJournal) {
      netDue += Number(client.openingBalance || 0);
    }

    currentRemainingDue = Math.max(0, Number(netDue.toFixed(2)));
  }

  // Total due before this transaction = current remaining due + total paid in this transaction
  const previousTotalDue = Number((currentRemainingDue + totalPaidInThisTx).toFixed(2));

  const paperSize = posSettings.paperSize || "80mm";
  const widthClass = 
    paperSize === "58mm" 
      ? "max-w-[240px]" 
      : paperSize === "A4" 
      ? "max-w-4xl px-12" 
      : "max-w-[380px]";

  const createdAtDate = new Date(voucher.date);

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

      <DueReceiptPrintButton />

      {/* Header Logo */}
      {posSettings.showHeaderLogo && posSettings.logoUrl && (
        <div className="flex justify-center mb-3 print:mb-2">
          <img
            src={posSettings.logoUrl}
            alt="Logo"
            className="max-h-12 object-contain"
          />
        </div>
      )}

      {/* Company Header Title */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold uppercase">{posSettings.headerText || "Ferrari Fashion"}</h1>
        {posSettings.subHeaderText && <p className="text-[10px] text-gray-600">{posSettings.subHeaderText}</p>}
        <p className="font-bold mt-1 text-xs">
          Receipt No: {voucher.voucherNumber || voucher.reference}
        </p>
      </div>

      {/* Info Grid (Matches Sales Receipt Layout) */}
      <div className="grid grid-cols-2 text-[10px] mb-4">
        <div>
          <p>Phone: {client?.phone || "N/A"}</p>
          <p>Customer: {client?.name || "Walk-in Customer"}</p>
          {posSettings.showBiller && <p>Biller: {cashierName}</p>}
        </div>
        <div className="text-right">
          <p>Date: {createdAtDate.toLocaleDateString()}</p>
          <p>Time: {createdAtDate.toLocaleTimeString()}</p>
          <p>Outlet: {voucher.warehouse?.name || posSettings.headerText || "Ferrari Fashion"}</p>
        </div>
      </div>

      {/* Due Collection Receipt Header Banner */}
      <div className="text-center font-bold border-y border-dashed border-black py-1 mb-3">
        DUE COLLECTION RECEIPT
      </div>

      {/* Collection Payment Channels Breakdown */}
      <div className="mb-4 text-[10px] border-b border-dashed border-black pb-2 space-y-1">
        <p className="font-bold text-xs uppercase mb-1">Collection Breakdown:</p>
        {cashPaid > 0 && (
          <div className="flex justify-between">
            <span>Cash Collection:</span>
            <span className="font-mono">৳{cashPaid.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {cardPaid > 0 && (
          <div className="flex justify-between">
            <span>Card/POS Collection:</span>
            <span className="font-mono">৳{cardPaid.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {mfsPaid > 0 && (
          <div className="flex justify-between">
            <span>MFS/Wallet Collection:</span>
            <span className="font-mono">৳{mfsPaid.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {voucher.description && (
          <div className="text-[9px] text-gray-500 italic pt-0.5">
            Note: {voucher.description}
          </div>
        )}
      </div>

      {/* Financial Summary Box */}
      <div className="space-y-1.5 text-xs mb-6">
        <div className="flex justify-between font-semibold">
          <span>Total Previous Due:</span>
          <span className="font-mono">৳{previousTotalDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold text-black text-sm py-1 px-2 border border-black rounded">
          <span>Paid Amount:</span>
          <span className="font-mono">৳{totalPaidInThisTx.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold text-xs pt-1">
          <span>Remaining Due Balance:</span>
          <span className="font-mono">৳{currentRemainingDue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-left text-[10px] pt-4 border-t border-dashed border-gray-300">
        <div 
          className="font-medium text-gray-700 [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
          dangerouslySetInnerHTML={{ __html: posSettings.footerText || "Thank you for shopping with us!" }}
        />
        <p className="text-[8px] text-gray-400 italic mt-1 text-center">Software by ffERP</p>
      </div>
    </div>
  );
}
