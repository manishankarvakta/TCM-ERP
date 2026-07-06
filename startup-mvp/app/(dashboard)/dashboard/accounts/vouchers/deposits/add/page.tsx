import PageGuard from "@/components/permissions/page-guard";
import DepositsVoucherForm from "./_components/deposits-voucher-form";

export default function AddDepositsPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers" requiredOperation="create-deposit">
      <div className="space-y-6">
        <DepositsVoucherForm />
      </div>
    </PageGuard>
  );
}
