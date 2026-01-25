import PageGuard from "@/components/permissions/page-guard";
import PaymentVoucherForm from "./_components/payment-voucher-form";

export default function AddPaymentPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <PaymentVoucherForm />
      </div>
    </PageGuard>
  );
}
