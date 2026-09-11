"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiSearch,
  FiPlus,
  FiBox,
  FiDollarSign,
  FiTrendingDown,
  FiCalendar,
  FiCheckCircle,
} from "react-icons/fi";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { recordDepreciationEntry } from "../_actions/fixed-asset.action";
import { SearchableAccountSelect } from "./searchable-account-select";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface DepreciationViewProps {
  entries: any[];
  accumAccounts: AccountOption[];
  expenseAccounts: AccountOption[];
  selectedAccumId?: string;
}

export default function DepreciationView({
  entries = [],
  accumAccounts = [],
  expenseAccounts = [],
  selectedAccumId = "",
}: DepreciationViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(!!selectedAccumId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculator State
  const [cost, setCost] = useState("100000");
  const [salvage, setSalvage] = useState("10000");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");

  // Form State
  const defaultExpenseAcc =
    expenseAccounts.find((a) => a.name.toLowerCase().includes("depreciation")) ||
    expenseAccounts.find((a) => a.code.startsWith("62") || a.code.startsWith("60")) ||
    expenseAccounts[0];

  const [accumulatedDeprAccountId, setAccumulatedDeprAccountId] = useState(
    selectedAccumId || (accumAccounts[0]?.id || "")
  );
  const [expenseAccountId, setExpenseAccountId] = useState(
    defaultExpenseAcc?.id || ""
  );
  const [periodName, setPeriodName] = useState(
    new Date().toLocaleString("default", { month: "long", year: "numeric" })
  );
  const [manualAmount, setManualAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  // Calculated Depreciation values
  const annualDepreciation = useMemo(() => {
    const c = parseFloat(cost) || 0;
    const s = parseFloat(salvage) || 0;
    const y = parseFloat(usefulLifeYears) || 1;
    if (y <= 0) return 0;
    return Math.max(0, (c - s) / y);
  }, [cost, salvage, usefulLifeYears]);

  const monthlyDepreciation = useMemo(() => {
    return annualDepreciation / 12;
  }, [annualDepreciation]);

  const effectiveAmount = manualAmount ? parseFloat(manualAmount) : monthlyDepreciation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accumulatedDeprAccountId || isNaN(effectiveAmount) || effectiveAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select an accumulated depreciation account and a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordDepreciationEntry({
        accumulatedDeprAccountId,
        expenseAccountId: expenseAccountId || undefined,
        amount: Number(effectiveAmount.toFixed(2)),
        periodName: periodName || "Monthly Depreciation",
        date,
        description: description || `Depreciation Entry for ${periodName}`,
      });

      if (res.success) {
        toast({
          title: "Depreciation Posted",
          description: `Voucher ${res.voucherNumber} created and posted successfully`,
        });
        setIsAddModalOpen(false);
        setManualAmount("");
        setDescription("");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to record depreciation",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const term = search.toLowerCase();
    return (
      e.voucherNumber.toLowerCase().includes(term) ||
      e.description?.toLowerCase().includes(term) ||
      e.reference?.toLowerCase().includes(term)
    );
  });

  const totalDepreciation = entries.reduce((sum, e) => {
    const creditLine = e.VoucherLine?.find((l: any) => Number(l.creditAmount) > 0);
    return sum + (creditLine ? Number(creditLine.creditAmount) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-amber-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Depreciation Expenses
            </CardTitle>
            <FiTrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(totalDepreciation)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Journalized Depreciation</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Depreciation Entries
            </CardTitle>
            <FiCheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {entries.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Posted Periodic Adjustments</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search depreciation entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
          <FiCalendar className="h-4 w-4" /> Run Depreciation Entry
        </Button>
      </div>

      {/* Depreciation Entries Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Voucher #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Depreciation Expense (Debit)</TableHead>
              <TableHead>Accumulated Depr (Credit)</TableHead>
              <TableHead>Period / Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <FiBox className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">No depreciation entries recorded yet</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const debitLine = entry.VoucherLine?.find((l: any) => Number(l.debitAmount) > 0);
                const creditLine = entry.VoucherLine?.find((l: any) => Number(l.creditAmount) > 0);
                const amountVal = creditLine ? Number(creditLine.creditAmount) : 0;

                return (
                  <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono font-medium text-primary">
                      {entry.voucherNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(entry.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {debitLine?.ChartOfAccount?.code} - {debitLine?.ChartOfAccount?.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {creditLine?.ChartOfAccount?.code} - {creditLine?.ChartOfAccount?.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{entry.description}</div>
                      <Badge variant="outline" className="text-[10px] mt-0.5 border-amber-300 text-amber-700 bg-amber-50">
                        {entry.reference}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-sm text-amber-600 dark:text-amber-400">
                      {formatCurrency(amountVal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/dashboard/accounts/vouchers?search=${entry.voucherNumber}`}>
                          View Voucher
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Record Depreciation Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FiCalendar className="h-5 w-5 text-amber-600" /> Straight-Line Depreciation Entry
              </DialogTitle>
              <DialogDescription>
                Calculate straight-line depreciation or enter a periodic adjustment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Quick Calculator Tool */}
              <Card className="bg-muted/40 p-3 text-xs space-y-2 border">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Straight-Line Calculator Helper</span>
                  <Badge variant="secondary" className="text-[10px]">Auto-Calculated</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Asset Cost</Label>
                    <Input
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Salvage Value</Label>
                    <Input
                      type="number"
                      value={salvage}
                      onChange={(e) => setSalvage(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Life (Years)</Label>
                    <Input
                      type="number"
                      value={usefulLifeYears}
                      onChange={(e) => setUsefulLifeYears(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 font-mono text-[11px] text-muted-foreground border-t">
                  <span>Annual: <strong className="text-foreground">{formatCurrency(annualDepreciation)}</strong></span>
                  <span>Monthly: <strong className="text-amber-600 font-bold">{formatCurrency(monthlyDepreciation)}</strong></span>
                </div>
              </Card>

              <div className="space-y-2">
                <Label>Accumulated Depreciation Account (Credit) *</Label>
                <SearchableAccountSelect
                  options={accumAccounts}
                  value={accumulatedDeprAccountId}
                  onValueChange={setAccumulatedDeprAccountId}
                  placeholder="Search code or name (e.g. 1790)..."
                />
              </div>

              <div className="space-y-2">
                <Label>Depreciation Expense Account (Debit)</Label>
                <SearchableAccountSelect
                  options={expenseAccounts}
                  value={expenseAccountId}
                  onValueChange={setExpenseAccountId}
                  placeholder="Search code or name (e.g. 6200)..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="period">Period Name</Label>
                  <Input
                    id="period"
                    placeholder="e.g. September 2026"
                    value={periodName}
                    onChange={(e) => setPeriodName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualAmount">Depreciation Amount *</Label>
                  <Input
                    id="manualAmount"
                    type="number"
                    step="0.01"
                    placeholder={monthlyDepreciation.toFixed(2)}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Defaults to monthly calculator: {formatCurrency(effectiveAmount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Posting Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Post Depreciation Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
