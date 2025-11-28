export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage invoices</p>
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Invoices list will be displayed here.</p>
      </div>
    </div>
  );
}

