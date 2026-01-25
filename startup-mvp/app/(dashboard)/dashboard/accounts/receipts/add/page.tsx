import PageGuard from "@/components/permissions/page-guard";
import ReceiptVoucherForm from "./_components/receipt-voucher-form";

export default function AddReceiptPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <ReceiptVoucherForm />
      </div>
    </PageGuard>
  );
}
