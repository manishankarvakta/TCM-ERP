"use client";

import { useState } from "react";
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
import { FiSearch, FiPlus, FiBox, FiDollarSign, FiCalendar, FiCheckCircle } from "react-icons/fi";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { recordCapitalizationEntry } from "../_actions/fixed-asset.action";
import { SearchableAccountSelect } from "./searchable-account-select";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface CapitalizationViewProps {
  entries: any[];
  assetAccounts: AccountOption[];
  paymentAccounts: AccountOption[];
  selectedAssetId?: string;
}

export default function CapitalizationView({
  entries = [],
  assetAccounts = [],
  paymentAccounts = [],
  selectedAssetId = "",
}: CapitalizationViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(!!selectedAssetId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [assetAccountId, setAssetAccountId] = useState(selectedAssetId || (assetAccounts[0]?.id || ""));
  const [paymentAccountId, setPaymentAccountId] = useState(paymentAccounts[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("Asset Capitalization");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!assetAccountId || !paymentAccountId || isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select valid asset and payment accounts and a positive amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordCapitalizationEntry({
        assetAccountId,
        paymentAccountId,
        amount: numAmount,
        date,
        description: description || "Fixed Asset Acquisition / Capitalization",
        reference: reference || "Asset Capitalization",
      });

      if (res.success) {
        toast({
          title: "Capitalization Posted",
          description: `Voucher ${res.voucherNumber} created and posted successfully`,
        });
        setIsAddModalOpen(false);
        setAmount("");
        setDescription("");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to record capitalization",
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

  const totalCapitalized = entries.reduce((sum, e) => {
    const debitLine = e.VoucherLine?.find((l: any) => Number(l.debitAmount) > 0);
    return sum + (debitLine ? Number(debitLine.debitAmount) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-600 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Capitalized Value
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatCurrency(totalCapitalized)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recorded Capital Additions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Capitalization Entries
            </CardTitle>
            <FiCheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {entries.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Posted Voucher Transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search capitalization vouchers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <FiPlus className="h-4 w-4" /> Record Capitalization Entry
        </Button>
      </div>

      {/* Entries Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Voucher #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Asset Account (Debit)</TableHead>
              <TableHead>Funding Account (Credit)</TableHead>
              <TableHead>Description / Ref</TableHead>
              <TableHead className="text-right">Capitalized Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <FiBox className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">No capitalization entries recorded yet</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const debitLine = entry.VoucherLine?.find((l: any) => Number(l.debitAmount) > 0);
                const creditLine = entry.VoucherLine?.find((l: any) => Number(l.creditAmount) > 0);
                const capitalizedVal = debitLine ? Number(debitLine.debitAmount) : 0;

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
                      <div>{entry.description || "Capitalization"}</div>
                      <Badge variant="outline" className="text-[10px] mt-0.5">
                        {entry.reference}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(capitalizedVal)}
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

      {/* Record Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Record Asset Capitalization</DialogTitle>
              <DialogDescription>
                Record asset additions or purchases into fixed asset ledger accounts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Fixed Asset Account (Debit) *</Label>
                <SearchableAccountSelect
                  options={assetAccounts}
                  value={assetAccountId}
                  onValueChange={setAssetAccountId}
                  placeholder="Search & select asset account..."
                />
              </div>

              <div className="space-y-2">
                <Label>Funding / Payment Account (Credit) *</Label>
                <SearchableAccountSelect
                  options={paymentAccounts}
                  value={paymentAccountId}
                  onValueChange={setPaymentAccountId}
                  placeholder="Search & select cash/bank/payable account..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

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
                  placeholder="e.g. Purchased Dell XPS 15 Laptop for Engineering"
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Post Capitalization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
