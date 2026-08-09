import PageGuard from "@/components/permissions/page-guard";
import TransferVoucherForm from "./_components/transfer-voucher-form";

export default function AddTransferPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <TransferVoucherForm />
      </div>
    </PageGuard>
  );
}
