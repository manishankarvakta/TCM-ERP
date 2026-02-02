import PageGuard from "@/components/permissions/page-guard";
import VoucherForm from "../_components/voucher-form";

export default function CreateVoucherPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <VoucherForm mode="create" />
    </PageGuard>
  );
}
