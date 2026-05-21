"use client";

import { useEffect, useState } from "react";
import { getProjectFinancialMetrics } from "@/app/actions/projects/financials.action";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export function ProjectPnLDashboard({ projectId }: { projectId: string }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjectFinancialMetrics(projectId).then((res) => {
      if (res.success) {
        setMetrics(res.data);
      } else {
        setError(res.error || "Failed to load metrics");
      }
      setLoading(false);
    });
  }, [projectId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  if (error) return <div className="p-4 text-destructive">{error}</div>;
  if (!metrics) return null;

  const { pnl } = metrics;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Gross Margin Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            Gross Profit Margin
            <DollarSign className="w-4 h-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${pnl.profitability.grossMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(pnl.profitability.grossMargin)}
            </div>
            {pnl.profitability.grossMargin >= 0 ? 
              <TrendingUp className="w-5 h-5 text-green-600" /> : 
              <TrendingDown className="w-5 h-5 text-destructive" />
            }
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round(pnl.profitability.marginPercentage)}% Margin
          </div>
        </CardContent>
      </Card>

      {/* Burn Rate Card */}
      <Card className={pnl.burnRate.status === "OVER_BUDGET" ? "border-destructive/50 bg-destructive/10" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            Budget Burn Rate
            {pnl.burnRate.status !== "ON_TRACK" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(pnl.burnRate.percentage)}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(pnl.costs.total)} spent of {formatCurrency(pnl.budget.TOTAL)} budget
          </div>
          <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${pnl.burnRate.percentage > 100 ? 'bg-destructive' : pnl.burnRate.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(pnl.burnRate.percentage, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Cost Allocation (General Ledger Flow)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Material Costs (Purchases)</span>
              <span className="font-medium">{formatCurrency(pnl.costs.materials)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Labor Costs (Timesheet vs Payroll)</span>
              <span className="font-medium">{formatCurrency(pnl.costs.labor)}</span>
            </div>
            <div className="pt-3 border-t flex justify-between items-center font-bold">
              <span>Total Accrued Cost</span>
              <span>{formatCurrency(pnl.costs.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
