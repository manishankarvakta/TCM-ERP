export default function AllItemsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">All Items</h1>
          <p className="text-sm text-muted-foreground">Manage all your items</p>
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Items list will be displayed here.</p>
      </div>
    </div>
  );
}

