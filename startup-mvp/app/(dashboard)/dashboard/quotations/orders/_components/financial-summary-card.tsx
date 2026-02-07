import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import { Separator } from "@/components/ui/separator";

interface FinancialSummaryProps {
  summary: {
    orderValue: number;
    deliveredValue: number;
    invoicedValue: number;
    advanceReceived: number;
    advanceApplied: number;
    advanceRemaining: number;
    outstandingDue: number;
  };
}

export default function FinancialSummaryCard({ summary }: FinancialSummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {/* Value Metrics */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Order Value</span>
                    <span className="font-semibold text-base">{formatCurrency(summary.orderValue)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-blue-600">
                    <span>Delivered Value</span>
                    <span>{formatCurrency(summary.deliveredValue)}</span>
                </div>
                <div className="flex justify-between items-center text-indigo-600">
                    <span>Invoiced Value</span>
                    <span>{formatCurrency(summary.invoicedValue)}</span>
                </div>
            </div>

             {/* Payment Metrics */}
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Outstanding Due (AR)</span>
                    <span className={summary.outstandingDue > 0 ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                        {formatCurrency(summary.outstandingDue)}
                    </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-muted-foreground text-xs">
                    <span>Advance Received</span>
                    <span>{formatCurrency(summary.advanceReceived)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground text-xs">
                    <span>Advance Applied</span>
                    <span>{formatCurrency(summary.advanceApplied)}</span>
                </div>
                <div className="flex justify-between items-center font-medium">
                    <span>Unused Advance</span>
                    <span>{formatCurrency(summary.advanceRemaining)}</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
