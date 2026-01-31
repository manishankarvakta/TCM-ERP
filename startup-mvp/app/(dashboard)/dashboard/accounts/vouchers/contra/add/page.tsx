import PageGuard from "@/components/permissions/page-guard";
import ContraVoucherForm from "./_components/contra-voucher-form";

export default function AddContraPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <ContraVoucherForm />
      </div>
    </PageGuard>
  );
}
