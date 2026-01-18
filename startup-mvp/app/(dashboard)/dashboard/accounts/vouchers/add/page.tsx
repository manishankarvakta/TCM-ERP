import PageGuard from "@/components/permissions/page-guard";
import VoucherCreateForm from "./_components/voucher-create-form";

export default function AddVoucherPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <VoucherCreateForm />
      </div>
    </PageGuard>
  );
}
