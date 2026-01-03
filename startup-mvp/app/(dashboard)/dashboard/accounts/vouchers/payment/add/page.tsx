import PageGuard from "@/components/permissions/page-guard";
import ReceiptPaymentForm from "../../add/_components/receipt-payment-form";
import { VoucherType } from "@prisma/client";

export default function AddPaymentVoucherPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <ReceiptPaymentForm voucherType={VoucherType.PAYMENT} />
      </div>
    </PageGuard>
  );
}

