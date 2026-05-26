import { getCashBankAccounts } from "./_actions/cash-bank.action";
import CashBankList from "./_components/cash-bank-list";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function CashBankPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions on server side
  const [result, canCreate, canEdit] = await Promise.all([
    getCashBankAccounts(),
    userId ? hasPermission(userId, "accounts.cash-bank", "create") : false,
    userId ? hasPermission(userId, "accounts.cash-bank", "edit") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Cash & Bank</h1>
            <p className="text-sm text-muted-foreground">Manage cash and bank accounts</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load cash & bank accounts"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="accounts.cash-bank">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Cash & Bank</h1>
            <p className="text-sm text-muted-foreground">Manage cash and bank accounts</p>
          </div>
        </div>

        <CashBankList
          cashAccounts={result.accounts?.cash || []}
          bankAccounts={result.accounts?.bank || []}
          walletAccounts={result.accounts?.wallets || []}
          permissions={{
            create: canCreate,
            edit: canEdit,
          }}
        />
      </div>
    </PageGuard>
  );
}
