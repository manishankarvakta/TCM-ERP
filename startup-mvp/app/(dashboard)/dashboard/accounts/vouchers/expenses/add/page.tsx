import PageGuard from "@/components/permissions/page-guard";
import ExpensesVoucherForm from "./_components/expenses-voucher-form";

export default function AddExpensesPage() {
  return (
    <PageGuard permissionKey="accounts.vouchers" requiredOperation="create-expense">
      <div className="space-y-6">
        <ExpensesVoucherForm />
      </div>
    </PageGuard>
  );
}
