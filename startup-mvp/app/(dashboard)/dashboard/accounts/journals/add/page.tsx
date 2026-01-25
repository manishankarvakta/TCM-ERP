import PageGuard from "@/components/permissions/page-guard";
import JournalVoucherForm from "./_components/journal-voucher-form";

export default function AddJournalPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <JournalVoucherForm />
      </div>
    </PageGuard>
  );
}
