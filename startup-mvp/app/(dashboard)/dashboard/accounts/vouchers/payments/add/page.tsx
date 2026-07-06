import PageGuard from "@/components/permissions/page-guard";
import PaymentsVoucherForm from "./_components/payments-voucher-form";

export default function AddPaymentsPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers" requiredOperation="create-payment">
      <div className="space-y-6">
        <PaymentsVoucherForm />
      </div>
    </PageGuard>
  );
}
