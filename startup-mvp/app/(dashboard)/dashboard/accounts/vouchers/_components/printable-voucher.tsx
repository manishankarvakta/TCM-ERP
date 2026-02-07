import { format } from "date-fns";

interface PrintableVoucherProps {
  voucher: any;
  organization?: any;
}

export default function PrintableVoucher({ voucher, organization }: PrintableVoucherProps) {
  const orgName = organization?.name || "Espacio";
  const orgAddress = organization?.address || "Dhaka, Bangladesh";

  const totalDebit = voucher.voucherLines.reduce((sum: number, line: any) => sum + Number(line.debitAmount), 0);
  const totalCredit = voucher.voucherLines.reduce((sum: number, line: any) => sum + Number(line.creditAmount), 0);

  return (
    <div id="printable-content" className="p-8 hidden print:block text-black bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-2">{orgName}</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="whitespace-pre-wrap max-w-xs">{orgAddress}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 uppercase">{voucher.type} VOUCHER</h1>
          <div className="space-y-1 text-sm">
             <p><span className="font-semibold text-gray-600">Voucher #:</span> {voucher.voucherNumber}</p>
             <p><span className="font-semibold text-gray-600">Date:</span> {format(new Date(voucher.date), "MMM d, yyyy")}</p>
             <p><span className="font-semibold text-gray-600">Status:</span> <span className="uppercase">{voucher.status}</span></p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="flex justify-between mb-8">
          <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Reference</p>
              <p className="font-medium">{voucher.reference || "-"}</p>
          </div>
          {voucher.description && (
              <div className="flex-1 ml-12 text-right">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">Description</p>
                  <p className="font-medium">{voucher.description}</p>
              </div>
          )}
      </div>

      {/* Lines Table */}
      <div className="mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 text-left font-bold text-gray-700 w-12">#</th>
              <th className="py-2 text-left font-bold text-gray-700">Account</th>
              <th className="py-2 text-left font-bold text-gray-700">Narration</th>
              <th className="py-2 text-right font-bold text-gray-700 w-32">Debit</th>
              <th className="py-2 text-right font-bold text-gray-700 w-32">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {voucher.voucherLines.map((line: any) => (
              <tr key={line.id}>
                <td className="py-3 text-gray-500">{line.lineNumber}</td>
                <td className="py-3 text-gray-800 font-medium">
                    {line.chartOfAccount?.code ? `${line.chartOfAccount.code} - ` : ""}{line.chartOfAccount?.name || "Unknown"}
                </td>
                <td className="py-3 text-gray-600 italic">
                    {line.description || "-"}
                </td>
                <td className="py-3 text-right text-gray-800">{Number(line.debitAmount) > 0 ? Number(line.debitAmount).toFixed(2) : "-"}</td>
                <td className="py-3 text-right text-gray-800">{Number(line.creditAmount) > 0 ? Number(line.creditAmount).toFixed(2) : "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
             <tr className="border-t-2 border-gray-800">
                <td colSpan={3} className="py-3 text-right font-bold text-gray-800">Total</td>
                <td className="py-3 text-right font-bold text-gray-800">{totalDebit.toFixed(2)}</td>
                <td className="py-3 text-right font-bold text-gray-800">{totalCredit.toFixed(2)}</td>
             </tr>
          </tfoot>
        </table>
      </div>

      {/* Signatures */}
      <div className="mt-32 flex justify-between items-end">
        <div className="text-center">
            <div className="w-48 border-t border-gray-400 pt-2">
                <p className="text-xs font-semibold text-gray-600">Prepared By</p>
                <p className="text-sm mt-1">{voucher.creator.name}</p>
            </div>
        </div>
        
        <div className="text-center">
            <div className="w-48 border-t border-gray-400 pt-2">
                <p className="text-xs font-semibold text-gray-600">Checked By</p>
            </div>
        </div>

        <div className="text-center">
            <div className="w-48 border-t border-gray-400 pt-2">
                <p className="text-xs font-semibold text-gray-600">Authorized Signature</p>
            </div>
        </div>
      </div>
      
       <div className="mt-12 pt-4 border-t text-xs text-gray-400 text-center">
          Generated via Espacio on {format(new Date(), "PPpp")}
       </div>
    </div>
  );
}
