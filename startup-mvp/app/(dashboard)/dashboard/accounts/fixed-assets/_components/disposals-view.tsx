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
  FiTrendingUp,
  FiTrendingDown,
  FiTrash2,
} from "react-icons/fi";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { recordDisposalEntry } from "../_actions/fixed-asset.action";
import { SearchableAccountSelect } from "./searchable-account-select";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  balance?: number;
}

interface DisposalsViewProps {
  entries: any[];
  assetAccounts: AccountOption[];
  accumAccounts: AccountOption[];
  paymentAccounts: AccountOption[];
}

export default function DisposalsView({
  entries = [],
  assetAccounts = [],
  accumAccounts = [],
  paymentAccounts = [],
}: DisposalsViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [assetAccountId, setAssetAccountId] = useState(assetAccounts[0]?.id || "");
  const [accumulatedDeprAccountId, setAccumulatedDeprAccountId] = useState(accumAccounts[0]?.id || "");
  const [paymentAccountId, setPaymentAccountId] = useState(paymentAccounts[0]?.id || "");

  const [grossCostStr, setGrossCostStr] = useState(
    assetAccounts[0]?.balance ? String(assetAccounts[0].balance) : "0"
  );
  const [accumDeprStr, setAccumDeprStr] = useState(
    accumAccounts[0]?.balance ? String(accumAccounts[0].balance) : "0"
  );
  const [saleProceedsStr, setSaleProceedsStr] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState(
    assetAccounts[0] ? `Disposal of ${assetAccounts[0].name}` : ""
  );

  const handleSelectAssetAccount = (id: string) => {
    setAssetAccountId(id);
    const selected = assetAccounts.find((a) => a.id === id);
    if (selected) {
      if (selected.balance && selected.balance > 0) {
        setGrossCostStr(String(selected.balance));
      }
      setDescription(`Disposal of ${selected.name}`);
    }
  };

  const grossCost = parseFloat(grossCostStr) || 0;
  const accumDepr = parseFloat(accumDeprStr) || 0;
  const saleProceeds = parseFloat(saleProceedsStr) || 0;

  const netBookValue = Math.max(0, grossCost - accumDepr);
  const gainOrLoss = saleProceeds - netBookValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetAccountId || !paymentAccountId || grossCost <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select valid asset and payment accounts and a positive gross cost",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordDisposalEntry({
        assetAccountId,
        accumulatedDeprAccountId: accumulatedDeprAccountId || undefined,
        paymentAccountId,
        grossCost,
        accumulatedDeprAmount: accumDepr,
        saleProceeds,
        date,
        description: description || "Asset Disposal / Retirement",
      });

      if (res.success) {
        toast({
          title: "Disposal Entry Posted",
          description: `Voucher ${res.voucherNumber} recorded successfully`,
        });
        setIsAddModalOpen(false);
        setDescription("");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to record asset disposal",
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

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-rose-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Disposal Entries
            </CardTitle>
            <FiTrash2 className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {entries.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Retired / Sold Fixed Assets</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sale Proceeds
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatCurrency(
                entries.reduce((sum, e) => {
                  const proceedsLine = e.VoucherLine?.find(
                    (l: any) => l.description?.includes("Proceeds") || l.description?.includes("Sale")
                  );
                  return sum + (proceedsLine ? Number(proceedsLine.debitAmount) : 0);
                }, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cash / Bank Inflows</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search disposal entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
          <FiTrash2 className="h-4 w-4" /> Record Asset Disposal
        </Button>
      </div>

      {/* Disposals Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Voucher #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <FiBox className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">No asset disposal entries recorded yet</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono font-medium text-primary">
                    {entry.voucherNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(entry.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {entry.description || "Asset Disposal"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[10px]">
                      {entry.reference}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/accounts/vouchers?search=${entry.voucherNumber}`}>
                        View Voucher
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Record Disposal Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <FiTrash2 className="h-5 w-5" /> Record Fixed Asset Disposal
              </DialogTitle>
              <DialogDescription>
                Derecognize retired/sold fixed asset cost, clear accumulated depreciation, and record gain or loss.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Fixed Asset Account to Remove *</Label>
                <SearchableAccountSelect
                  options={assetAccounts}
                  value={assetAccountId}
                  onValueChange={handleSelectAssetAccount}
                  placeholder="Search & select asset account..."
                />
              </div>

              <div className="space-y-2">
                <Label>Accumulated Depreciation Account</Label>
                <SearchableAccountSelect
                  options={accumAccounts}
                  value={accumulatedDeprAccountId}
                  onValueChange={setAccumulatedDeprAccountId}
                  placeholder="Search & select contra-asset account..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Original Gross Cost *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={grossCostStr}
                    onChange={(e) => setGrossCostStr(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accumulated Depr.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={accumDeprStr}
                    onChange={(e) => setAccumDeprStr(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sale Proceeds</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={saleProceedsStr}
                    onChange={(e) => setSaleProceedsStr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Receiving Account *</Label>
                  <SearchableAccountSelect
                    options={paymentAccounts}
                    value={paymentAccountId}
                    onValueChange={setPaymentAccountId}
                    placeholder="Search bank / cash..."
                  />
                </div>
              </div>

              {/* Real-time Calculation Summary */}
              <Card className="bg-muted/40 p-3 text-xs space-y-1 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Book Value (NBV):</span>
                  <strong className="font-mono">{formatCurrency(netBookValue)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calculated Result:</span>
                  <strong
                    className={`font-mono ${
                      gainOrLoss >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {gainOrLoss >= 0
                      ? `+${formatCurrency(gainOrLoss)} (Gain)`
                      : `-${formatCurrency(Math.abs(gainOrLoss))} (Loss)`}
                  </strong>
                </div>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  placeholder="e.g. Sold old delivery truck to scrap dealer"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Post Asset Disposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
