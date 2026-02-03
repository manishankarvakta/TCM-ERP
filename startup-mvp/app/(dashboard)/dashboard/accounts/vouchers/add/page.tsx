
import { VoucherType } from "@prisma/client";
import PageGuard from "@/components/permissions/page-guard";
import JournalVoucherForm from "./_components/journal-voucher-form";
import ReceiptPaymentForm from "./_components/receipt-payment-form";
import ContraVoucherForm from "./_components/contra-voucher-form";
import PaymentVoucherForm from "./_components/payment-voucher-form";
import ReceiptVoucherForm from "./_components/receipt-voucher-form";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AddVoucherPageProps {
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function AddVoucherPage({ searchParams }: AddVoucherPageProps) {
  const params = await searchParams;
  const typeStr = params.type?.toUpperCase() || "JOURNAL";
  
  // Safely map string to VoucherType enum
  let type: VoucherType = VoucherType.JOURNAL;
  if (Object.values(VoucherType).includes(typeStr as VoucherType)) {
    type = typeStr as VoucherType;
  }

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6 max-w-5xl mx-auto">

        {type === VoucherType.PAYMENT && <PaymentVoucherForm />}
        {type === VoucherType.RECEIPT && <ReceiptVoucherForm />}
        {type === VoucherType.CONTRA && <ContraVoucherForm />}
        {type === VoucherType.JOURNAL && <JournalVoucherForm />}
        
        {/* Fallback for system types or unknown types */}
        {!( [VoucherType.PAYMENT, VoucherType.RECEIPT, VoucherType.CONTRA, VoucherType.JOURNAL] as VoucherType[]).includes(type) && (
            <div className="p-12 text-center border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium">Restricted Voucher Type</h3>
                <p className="text-muted-foreground mt-2">
                    Vouchers of type <strong>{type}</strong> cannot be manually updated. 
                    Please use the respective module (Sales/Purchase) to manage these transactions.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/dashboard/accounts/vouchers">Go Back</Link>
                </Button>
            </div>
        )}
      </div>
    </PageGuard>
  );
}
