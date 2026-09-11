"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  FiBarChart2,
  FiBox,
  FiTrendingDown,
  FiDollarSign,
  FiArrowRight,
  FiBookOpen,
} from "react-icons/fi";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { createFixedAssetAccount } from "../_actions/fixed-asset.action";

interface AssetAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  debit: number;
  credit: number;
  isAccumulatedDepr?: boolean;
}

interface MetricSummary {
  grossCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  totalAccounts: number;
}

interface FixedAssetsViewProps {
  assets: AssetAccount[];
  metrics: MetricSummary;
}

export default function FixedAssetsView({
  assets = [],
  metrics = { grossCost: 0, accumulatedDepreciation: 0, netBookValue: 0, totalAccounts: 0 },
}: FixedAssetsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) {
      toast({
        title: "Validation Error",
        description: "Account Code and Name are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createFixedAssetAccount({
        code: newCode,
        name: newName,
        description: newDesc,
      });

      if (res.success) {
        toast({
          title: "Account Created",
          description: `Fixed asset account '${newName}' (${newCode}) created successfully`,
        });
        setIsAddModalOpen(false);
        setNewCode("");
        setNewName("");
        setNewDesc("");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === "ACCUM_DEPR") {
      return a.isAccumulatedDepr;
    } else if (categoryFilter === "COST") {
      return !a.isAccumulatedDepr;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-600 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Net Book Value (NBV)
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatCurrency(metrics.netBookValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gross Cost - Accum. Depr.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Gross Asset Cost
            </CardTitle>
            <FiBox className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.grossCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acquisition & Capital Additions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Accumulated Depreciation
            </CardTitle>
            <FiTrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(metrics.accumulatedDepreciation)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Contra-Asset Value</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fixed Asset Accounts
            </CardTitle>
            <FiBarChart2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {metrics.totalAccounts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active Ledger Accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by code or asset name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Account Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Asset Accounts</SelectItem>
              <SelectItem value="COST">Gross Cost Accounts</SelectItem>
              <SelectItem value="ACCUM_DEPR">Accum. Depreciation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <FiPlus className="h-4 w-4" /> Add Asset Account
          </Button>
        </div>
      </div>

      {/* Asset Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Asset Account Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Total Debit</TableHead>
              <TableHead className="text-right">Total Credit</TableHead>
              <TableHead className="text-right">Net Carrying Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <FiBox className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">No fixed asset accounts found matching criteria</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono font-medium text-primary">
                    <Link
                      href={`/dashboard/accounts/ledgers?accountId=${asset.id}`}
                      className="hover:underline"
                    >
                      {asset.code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{asset.name}</span>
                      {asset.isAccumulatedDepr && (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          Contra-Asset
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {asset.isAccumulatedDepr ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                        Depreciation
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                        Fixed Asset
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(asset.debit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(asset.credit)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-sm text-primary">
                    {formatCurrency(asset.balance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
                        <Link href={`/dashboard/accounts/ledgers?accountId=${asset.id}`}>
                          <FiBookOpen className="mr-1 h-3.5 w-3.5" /> Ledger
                        </Link>
                      </Button>
                      {!asset.isAccumulatedDepr ? (
                        <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                          <Link href={`/dashboard/accounts/fixed-assets/capitalization?assetId=${asset.id}`}>
                            + Capitalize
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                          <Link href={`/dashboard/accounts/fixed-assets/depreciation?accumId=${asset.id}`}>
                            + Depreciate
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Asset Account Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddAccount}>
            <DialogHeader>
              <DialogTitle>Add Fixed Asset Account</DialogTitle>
              <DialogDescription>
                Create a new General Ledger account under the Fixed Assets (1700) category.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Account Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g. 1740"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Computer Hardware & Servers"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  placeholder="Optional description of asset category"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
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
                {isSubmitting ? "Creating..." : "Create Asset Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
