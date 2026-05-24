import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const sale = await prisma.sale.findUnique({
    where: { id: resolvedParams.id },
    include: {
      client: true,
      createdByUser: true,
      items: {
        include: {
          item: true,
        }
      }
    }
  });

  if (!sale) {
    return notFound();
  }

  const isReturn = sale.grandTotal.toNumber() < 0;

  const totalItems = sale.items.length;
  const totalQty = sale.items.reduce((sum, item) => sum + Math.abs(item.quantity.toNumber()), 0);

  return (
    <div className="bg-white text-black min-h-screen p-8 text-sm max-w-[400px] mx-auto font-sans relative">
      <PrintButton />
      
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">TCM Model Pharmacy</h1>
        <p className="text-xs">BIN 004601696-0102 | Mushak 6.3</p>
        <p className="font-bold mt-1 text-sm">
          {isReturn ? "Return Invoice No:" : "Invoice No:"} {sale.saleNumber}
        </p>
      </div>

      <div className="grid grid-cols-2 text-xs mb-4">
        <div>
          <p>Phone: {sale.client?.phone || "N/A"}</p>
          <p>Customer: {sale.client?.name || "Walk-in Customer"}</p>
          <p>Biller: {sale.createdByUser?.name || "System"}</p>
        </div>
        <div className="text-right">
          <p>Date: {sale.createdAt.toLocaleDateString()}</p>
          <p>Time: {sale.createdAt.toLocaleTimeString()}</p>
          <p>Outlet: TCM Model Pharmacy</p>
        </div>
      </div>

      <div className="text-center font-bold border-y border-dashed border-black py-1 mb-2">
        {isReturn ? "RETURN DETAILS" : "ORDER DETAILS"}
      </div>

      <table className="w-full text-xs mb-4">
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
          {sale.items.length === 0 && (
            <tr>
              <td colSpan={5} className="py-2 text-center">No Product in Purchase cart</td>
            </tr>
          )}
          {sale.items.map((item, index) => (
            <tr key={item.id}>
              <td className="py-1 align-top">{index + 1}</td>
              <td className="align-top">
                {item.description || item.item?.name}
              </td>
              <td className="text-center align-top">{Math.abs(item.quantity.toNumber())}</td>
              <td className="text-right align-top">{item.unitPrice.toNumber().toFixed(2)}</td>
              <td className="text-right align-top">{Math.abs(item.amount.toNumber()).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 text-xs border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>Total Item: {totalItems}</span>
          <span>Total Qty: {totalQty}</span>
        </div>
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{Math.abs(sale.subTotal.toNumber()).toFixed(2)}</span>
        </div>
        {sale.discount && sale.discount.toNumber() !== 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>{sale.discount.toNumber().toFixed(2)}</span>
          </div>
        )}
        {sale.tax && sale.tax.toNumber() !== 0 && (
          <div className="flex justify-between">
            <span>VAT:</span>
            <span>{sale.tax.toNumber().toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t border-black border-dashed pt-1 mt-1">
          <span>Net Amount:</span>
          <span className="border border-black px-1">{Math.abs(sale.grandTotal.toNumber()).toFixed(2)}</span>
        </div>
      </div>

      <div className="text-[10px] mt-4 leading-tight">
        <p>বিঃদ্রঃ</p>
        <p>১. তাপ সংবেদনশীল সকল ঔষধ, সুগার টেস্ট স্ট্রিপ এবং ঔষধের কাটা পাতা অফেরতযোগ্য।</p>
        <p>২. ঔষধ ক্রয়ের সময় নিজ দায়িত্বে ঔষধের পরিমাণ এবং মেয়াদ উত্তীর্ণ তারিখ দেখে নিন।</p>
        <p>৩. ক্রয় কৃত পণ্য ৪৮ ঘন্টার মধ্যে পরিবর্তনযোগ্য এবং সেলস স্লিপ সাথে আনতে হবে।</p>
      </div>

      <div className="text-center text-[10px] mt-4">
        <p>********************ধন্যবাদ********************</p>
        <p>www.tcm-bd.com</p>
        <p className="font-bold text-xs mt-1">Hot Line: 01742225636</p>
        <p className="italic">Thank you for shopping with us.</p>
      </div>
    </div>
  );
}
