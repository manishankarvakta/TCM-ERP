import { Card, CardContent } from "@/components/ui/card";

export default function TrialBalancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trial Balance</h1>
          <p className="text-sm text-muted-foreground">View trial balance report</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
            No data yet
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

