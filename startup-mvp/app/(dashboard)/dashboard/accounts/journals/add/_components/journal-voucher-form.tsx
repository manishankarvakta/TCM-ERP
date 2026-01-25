"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch, FiAlertTriangle, FiInfo, FiLoader } from "react-icons/fi";
import { getAccountsForJournal } from "../../_actions/journal.action";
import { createVoucher, postVoucher } from "../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

// Voucher line schema
const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  debitAmount: z.number().min(0, "Amount must be >= 0").default(0),
  creditAmount: z.number().min(0, "Amount must be >= 0").default(0),
  description: z.string().optional(),
}).refine(
  (data) => {
    const hasDebit = data.debitAmount > 0;
    const hasCredit = data.creditAmount > 0;
    return (hasDebit && !hasCredit) || (!hasDebit && hasCredit);
  },
  {
    message: "Each line must have either debit OR credit, not both",
    path: ["debitAmount"],
  }
);

// Journal voucher schema with balance validation
const journalVoucherSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().min(1, "Description is required for journal entries"),
  lines: z.array(voucherLineSchema).min(2, "At least 2 lines are required"),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    return Math.abs(totalDebit - totalCredit) <= 0.01;
  },
  {
    message: "Double-entry balance mismatch: Total debits must equal total credits",
    path: ["lines"],
  }
);

type JournalVoucherFormData = z.infer<typeof journalVoucherSchema>;

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function JournalVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getAccountsForJournal();
        if (result.success) {
          setAccounts(result.accounts);
        } else {
          setError(result.error || "Failed to load accounts");
        }
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
        setError("Failed to load accounts. Please refresh the page.");
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const searchLower = accountSearch.toLowerCase();
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, accountSearch]);

  // Group accounts by type for better display
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, AccountOption[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    filteredAccounts.forEach((acc) => {
      if (groups[acc.type]) {
        groups[acc.type].push(acc);
      }
    });
    return groups;
  }, [filteredAccounts]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<JournalVoucherFormData>({
    resolver: zodResolver(journalVoucherSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      reference: "",
      description: "",
      lines: [
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");

  // Calculate totals
  const totalDebit = watchedLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = watchedLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference <= 0.01;

  const addLine = () => {
    append({
      chartOfAccountId: "",
      debitAmount: 0,
      creditAmount: 0,
      description: "",
    });
  };

  const removeLine = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  const onSubmit = async (data: JournalVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      const lines = data.lines.map((line, index) => ({
        lineNumber: index + 1,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        description: line.description || undefined,
        chartOfAccountId: line.chartOfAccountId,
      }));

      // Create the voucher
      const createResult = await createVoucher({
        date: data.date,
        type: VoucherType.JOURNAL,
        reference: data.reference || undefined,
        description: data.description,
        lines,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create journal voucher");
      }

      // Auto-post the voucher
      const postResult = await postVoucher(createResult.voucher!.id);

      if (!postResult.success) {
        throw new Error(postResult.error || "Voucher created but failed to post. Please post it manually.");
      }

      // Redirect to vouchers list
      const basePath = getBasePathFromPathname(pathname);
      router.push(`${basePath}/accounts/vouchers?tab=posted`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get account type badge variant
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "ASSET":
        return "default";
      case "LIABILITY":
        return "secondary";
      case "EQUITY":
        return "outline";
      case "REVENUE":
        return "default";
      case "EXPENSE":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loadingAccounts) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <FiLoader className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading accounts...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Journal Voucher
          <Badge variant="outline" className="font-normal">General Entry</Badge>
        </CardTitle>
        <CardDescription>
          Create general journal entries for adjustments, corrections, and non-cash transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Restriction Notice */}
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Restricted Account Types</p>
                <p className="text-xs mt-1">
                  Journal entries cannot be made to control accounts (AR, AP, Inventory, Sales Revenue, COGS) or Cash/Bank accounts.
                  Use the appropriate modules: Sales for AR, Purchases for AP, Stock for Inventory, Payment/Receipt for Cash/Bank.
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
              <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Common Journal Entry Uses:</p>
                <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                  <li>Depreciation entries (DR Depreciation Expense, CR Accumulated Depreciation)</li>
                  <li>Accrual entries (DR/CR Accrued Expenses/Income)</li>
                  <li>Correction entries for non-control accounts</li>
                  <li>Prepaid expense amortization</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Voucher Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Voucher Date *</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date")}
                  disabled={loading}
                />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  type="text"
                  placeholder="e.g., ADJ-001"
                  {...register("reference")}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="e.g., Monthly depreciation entry, Accrued salaries for December..."
                {...register("description")}
                disabled={loading}
                rows={2}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                A clear description is required for audit purposes.
              </p>
            </div>

            {/* Voucher Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Journal Entries *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  disabled={loading}
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>

              {errors.lines && typeof errors.lines.message === "string" && (
                <p className="text-sm text-destructive">{errors.lines.message}</p>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="w-32">Debit (DR)</TableHead>
                      <TableHead className="w-32">Credit (CR)</TableHead>
                      <TableHead>Line Note</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const lineError = errors.lines?.[index];
                      const selectedAccountId = watchedLines[index]?.chartOfAccountId;
                      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Controller
                                name={`lines.${index}.chartOfAccountId`}
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={loading}
                                  >
                                    <SelectTrigger className="min-w-[250px]">
                                      <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[400px]">
                                      <div className="p-2">
                                        <div className="relative">
                                          <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                                          <Input
                                            placeholder="Search accounts..."
                                            value={accountSearch}
                                            onChange={(e) => setAccountSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                              e.stopPropagation();
                                              if (e.key === "Enter") e.preventDefault();
                                            }}
                                            className="pl-8 h-8 text-xs"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div className="max-h-[300px] overflow-y-auto">
                                        {Object.entries(groupedAccounts).map(([type, accs]) => {
                                          if (accs.length === 0) return null;
                                          return (
                                            <div key={type}>
                                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                                {type}
                                              </div>
                                              {accs.map((account) => (
                                                <SelectItem
                                                  key={account.id}
                                                  value={account.id}
                                                  className="text-left"
                                                >
                                                  <span className="font-mono text-xs">{account.code}</span>
                                                  <span className="ml-2">{account.name}</span>
                                                </SelectItem>
                                              ))}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {selectedAccount && (
                                <Badge
                                  variant={getTypeBadgeVariant(selectedAccount.type)}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {selectedAccount.type}
                                </Badge>
                              )}
                            </div>
                            {lineError?.chartOfAccountId && (
                              <p className="text-xs text-destructive mt-1">
                                {lineError.chartOfAccountId.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`lines.${index}.debitAmount`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      setValue(`lines.${index}.creditAmount`, 0);
                                    }
                                  }}
                                  disabled={loading}
                                />
                              )}
                            />
                            {lineError?.debitAmount && (
                              <p className="text-xs text-destructive mt-1">
                                {lineError.debitAmount.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`lines.${index}.creditAmount`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      setValue(`lines.${index}.debitAmount`, 0);
                                    }
                                  }}
                                  disabled={loading}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`lines.${index}.description`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="text"
                                  placeholder="Optional note"
                                  {...field}
                                  disabled={loading}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            {fields.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLine(index)}
                                disabled={loading}
                              >
                                <FiTrash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end gap-6 pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Debit</p>
                  <p className="text-lg font-semibold font-mono">৳{totalDebit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Credit</p>
                  <p className="text-lg font-semibold font-mono">৳{totalCredit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className={`text-lg font-semibold font-mono ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                    ৳{difference.toFixed(2)}
                  </p>
                </div>
              </div>

              {!isBalanced && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Double-entry balance mismatch: Debits (৳{totalDebit.toFixed(2)}) must equal Credits (৳{totalCredit.toFixed(2)})
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !isBalanced || fields.length < 2}
              >
                {loading ? (
                  <>
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                    Creating & Posting...
                  </>
                ) : (
                  "Create & Post Journal"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
