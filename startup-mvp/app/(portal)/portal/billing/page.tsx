import { getPortalInvoices, getPortalPayments } from "@/app/actions/portal.action";
import React from "react";

export default async function PortalBillingPage() {
  const invoicesResult = await getPortalInvoices();
  const paymentsResult = await getPortalPayments();

  const invoices = invoicesResult.success && invoicesResult.invoices ? invoicesResult.invoices : [];
  const payments = paymentsResult.success && paymentsResult.payments ? paymentsResult.payments : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
        <p className="text-sm text-slate-500">Manage your outstanding balances and view payment receipts</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Invoices List */}
        <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-slate-900 border-b pb-2">Posted Invoices</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-500">Invoice #</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Date</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Total</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Outstanding</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">৳{inv.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">৳{inv.outstandingAmount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${inv.outstandingAmount <= 0.01 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {inv.outstandingAmount <= 0.01 ? "PAID" : "OUTSTANDING"}
                      </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No invoices posted.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-slate-900 border-b pb-2">Receipt History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-500">Receipt #</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Date</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Reference</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{pmt.paymentNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(pmt.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500">{pmt.reference || "N/A"}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">৳{pmt.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No payment records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
