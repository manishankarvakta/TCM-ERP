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
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch, FiFileText } from "react-icons/fi";
import { VoucherAccountingPreview } from "../../_components/voucher-accounting-preview";
import { createVoucher } from "../../_actions/voucher.action";
import { getChartOfAccounts } from "../../../chart-of-accounts/_actions/chart-of-accounts.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  debitAmount: z.number().min(0, "Debit amount must be >= 0").default(0),
  creditAmount: z.number().min(0, "Credit amount must be >= 0").default(0),
  description: z.string().optional(),
}).refine(
  (data) => {
    const hasDebit = data.debitAmount > 0;
    const hasCredit = data.creditAmount > 0;
    return (hasDebit && !hasCredit) || (!hasDebit && hasCredit) || (!hasDebit && !hasCredit);
  },
  {
    message: "Each line must have either debit OR credit",
    path: ["debitAmount"],
  }
);

const voucherFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(5, "Reason for adjustment must be at least 5 characters long"),
  lines: z.array(voucherLineSchema).min(2, "At least 2 lines are required"),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    return difference <= 0.01; // Allow small floating point differences
  },
  {
    message: "Double-entry balance mismatch: Total debits must equal total credits",
    path: ["lines"],
  }
);

type VoucherFormData = z.infer<typeof voucherFormSchema>;

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

  // Fetch active accounts for selection
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getChartOfAccounts(1, 1000, "", "active");
        if (result.success) {
          setAccounts(
            result.accounts.map((a) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
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

  // Filter accounts based on search term
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const searchLower = accountSearch.toLowerCase();
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, accountSearch]);

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

  const onSubmit = async (data: VoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      // Prepare lines with line numbers
      const lines = data.lines.map((line, index) => ({
        lineNumber: index + 1,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        description: line.description || undefined,
        chartOfAccountId: line.chartOfAccountId,
      }));

      const result = await createVoucher({
        date: data.date,
        type: VoucherType.JOURNAL,
        description: data.description || undefined,
        lines,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create voucher");
      }

      const basePath = getBasePathFromPathname(pathname);
      router.push(`${basePath}/accounts/vouchers`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-t-4 border-t-purple-500 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <FiFileText className="w-5 h-5" />
            </div>
            <CardTitle>Create Journal Voucher</CardTitle>
        </div>
        <CardDescription>
          Record general accounting entries for adjustments, non-cash transactions, or corrections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">
            <FiAlertCircle className="w-5 h-5 font-bold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900 leading-none mb-1">Warning: Adjustment Voucher Use Only</p>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Journal vouchers are for adjustments only. They cannot be used for sales, receipts, payments, or inventory.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Voucher Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
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

                <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Reason for Adjustment</Label>
                <Input
                    id="description"
                    placeholder="Provide a clear reason for this adjustment..."
                    {...register("description")}
                    disabled={loading}
                    className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                    <p className="text-[10px] text-destructive">{errors.description.message}</p>
                )}
                </div>
            </div>

            {/* Voucher Lines */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <Label className="text-base font-semibold">Accounting Entries</Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                   Use journal entries for corrections, accruals, or depreciation only. 
                   Business transactions must use their respective modules.
                </p>
              </div>

              {errors.lines && typeof errors.lines.message === "string" && (
                <p className="text-sm text-destructive">{errors.lines.message}</p>
              )}

              <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="w-[35%]">Account</TableHead>
                      <TableHead className="w-[20%] text-right text-purple-700 font-semibold">Debit</TableHead>
                      <TableHead className="w-[20%] text-right text-purple-700 font-semibold">Credit</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const lineError = errors.lines?.[index];
                      return (
                        <TableRow key={field.id} className="hover:bg-muted/30">
                          <TableCell className="text-center text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <Controller
                              name={`lines.${index}.chartOfAccountId`}
                              control={control}
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  disabled={loading || loadingAccounts}
                                >
                                  <SelectTrigger className="h-9 border-transparent hover:border-input focus:border-input bg-transparent hover:bg-background">
                                    <SelectValue placeholder="Select account..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    <div className="p-2 border-b mb-1 sticky top-0 bg-popover z-10 pb-2">
                                      <div className="relative">
                                        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                                        <Input
                                          placeholder="Search..."
                                          value={accountSearch}
                                          onChange={(e) => {
                                            setAccountSearch(e.target.value);
                                          }}
                                          onKeyDown={(e) => e.stopPropagation()}
                                          className="pl-8 h-8 text-xs"
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                      {filteredAccounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="text-left">
                                          <span className="font-medium">{account.name}</span> 
                                          <span className="ml-2 text-muted-foreground text-xs">({account.code})</span>
                                        </SelectItem>
                                      ))}
                                    </div>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {lineError?.chartOfAccountId && (
                              <p className="text-[10px] text-destructive px-3">
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
                                  className="text-right h-9 border-transparent hover:border-input focus:border-input bg-transparent hover:bg-background focus:bg-background"
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
                                  className="text-right h-9 border-transparent hover:border-input focus:border-input bg-transparent hover:bg-background focus:bg-background"
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
                                  placeholder="Note..."
                                  className="h-9 border-transparent hover:border-input focus:border-input bg-transparent hover:bg-background focus:bg-background"
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
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                <div className="bg-muted/20 p-2 border-t flex justify-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addLine}
                        disabled={loading || loadingAccounts}
                        className="text-primary hover:bg-primary/10"
                    >
                        <FiPlus className="mr-2 h-4 w-4" />
                        Add Line Entry
                    </Button>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end gap-8 pt-4 border-t">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Debit</p>
                  <p className="text-xl font-semibold text-foreground">{totalDebit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Credit</p>
                  <p className="text-xl font-semibold text-foreground">{totalCredit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
                  <p className={`text-xl font-semibold ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                    {difference.toFixed(2)}
                  </p>
                </div>
              </div>

              {!isBalanced && (
                <div className="flex items-start justify-end gap-2 text-sm text-destructive font-medium animate-pulse">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Entries are not balanced. Difference: {difference.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* ACCOUNTING IMPACT SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <VoucherAccountingPreview 
                    type={VoucherType.JOURNAL}
                    title="Adjustment / Correction"
                    impact="Balance Adjustments (Manual Debit/Credit)"
                    helper="Directly modifies ledger balances. Use with caution for non-transactional items."
                />
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !isBalanced || fields.length < 2 || totalDebit === 0} className="min-w-[140px] bg-purple-600 hover:bg-purple-700 text-white">
                {loading ? "Saving..." : "Save Journal Entry"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
