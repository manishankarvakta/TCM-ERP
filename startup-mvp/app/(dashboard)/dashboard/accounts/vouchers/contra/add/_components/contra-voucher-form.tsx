"use client";

import { useState, useEffect } from "react";
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
import { FiAlertCircle, FiPlus, FiTrash2, FiInfo, FiArrowRight } from "react-icons/fi";
import { createVoucher } from "../../../_actions/voucher.action";
import { getCashBankAccounts } from "../../../../cash-bank/_actions/cash-bank.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Cash/Bank account is required"),
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
    message: "Each line must have either debit OR credit",
    path: ["debitAmount"],
  }
);

const contraVoucherSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().optional().or(z.literal("")),
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

type ContraVoucherFormData = z.infer<typeof contraVoucherSchema>;

interface CashBankAccountOption {
  id: string;
  chartOfAccountId: string;
  code: string;
  name: string;
  type: "CASH" | "BANK";
}

export default function ContraVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [cashBankAccounts, setCashBankAccounts] = useState<CashBankAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Fetch Cash/Bank accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getCashBankAccounts();
        if (result.success && result.accounts) {
          const allAccounts: CashBankAccountOption[] = [
            ...result.accounts.cash.map((cb) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "CASH" as const,
            })),
            ...result.accounts.bank.map((cb) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "BANK" as const,
            })),
          ];
          setCashBankAccounts(allAccounts);
        }
      } catch (err) {
        console.error("Failed to fetch Cash/Bank accounts:", err);
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
  } = useForm<ContraVoucherFormData>({
    resolver: zodResolver(contraVoucherSchema),
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

  // Auto-balance second line when first line amount changes
  const handleAmountChange = (index: number, amount: number, isDebit: boolean) => {
    if (index === 0 && fields.length >= 2 && amount > 0) {
      if (isDebit) {
        setValue("lines.0.debitAmount", amount);
        setValue("lines.0.creditAmount", 0);
        setValue("lines.1.debitAmount", 0);
        setValue("lines.1.creditAmount", amount);
      } else {
        setValue("lines.0.debitAmount", 0);
        setValue("lines.0.creditAmount", amount);
        setValue("lines.1.debitAmount", amount);
        setValue("lines.1.creditAmount", 0);
      }
    }
  };

  const onSubmit = async (data: ContraVoucherFormData) => {
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

      const result = await createVoucher({
        date: data.date,
        type: VoucherType.CONTRA,
        description: data.description || undefined,
        lines,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create contra voucher");
      }

      const basePath = getBasePathFromPathname(pathname);
      router.push(`${basePath}/accounts/vouchers`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get account type badge
  const getAccountBadge = (chartOfAccountId: string) => {
    const account = cashBankAccounts.find((acc) => acc.chartOfAccountId === chartOfAccountId);
    if (!account) return null;
    return (
      <Badge variant={account.type === "CASH" ? "default" : "secondary"} className="ml-2 text-xs">
        {account.type}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Contra Voucher
          <Badge variant="outline" className="font-normal">Cash/Bank Transfer</Badge>
        </CardTitle>
        <CardDescription>
          Transfer funds between Cash and Bank accounts. Only Cash/Bank accounts are allowed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Info Box */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
              <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">How Contra Vouchers Work:</p>
                <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                  <li>Transfer money from one Cash/Bank account to another</li>
                  <li>Example: Cash <FiArrowRight className="inline h-3 w-3" /> Bank (Cash Deposit)</li>
                  <li>Example: Bank <FiArrowRight className="inline h-3 w-3" /> Cash (Cash Withdrawal)</li>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., Cash deposit to bank, Withdrawal for petty cash..."
                {...register("description")}
                disabled={loading}
                rows={2}
              />
            </div>

            {/* Voucher Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Transfer Details *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  disabled={loading || loadingAccounts}
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
                      <TableHead>Cash/Bank Account</TableHead>
                      <TableHead className="w-32">Debit (DR)</TableHead>
                      <TableHead className="w-32">Credit (CR)</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const lineError = errors.lines?.[index];
                      const selectedAccountId = watchedLines[index]?.chartOfAccountId;
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Controller
                                name={`lines.${index}.chartOfAccountId`}
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={loading || loadingAccounts}
                                  >
                                    <SelectTrigger className="min-w-[200px]">
                                      <SelectValue placeholder="Select Cash/Bank account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                                        CASH ACCOUNTS
                                      </div>
                                      {cashBankAccounts
                                        .filter((acc) => acc.type === "CASH")
                                        .map((account) => (
                                          <SelectItem key={account.chartOfAccountId} value={account.chartOfAccountId}>
                                            {account.code} - {account.name}
                                          </SelectItem>
                                        ))}
                                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-t mt-1">
                                        BANK ACCOUNTS
                                      </div>
                                      {cashBankAccounts
                                        .filter((acc) => acc.type === "BANK")
                                        .map((account) => (
                                          <SelectItem key={account.chartOfAccountId} value={account.chartOfAccountId}>
                                            {account.code} - {account.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {selectedAccountId && getAccountBadge(selectedAccountId)}
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
                                      control.setValue(`lines.${index}.creditAmount`, 0);
                                      handleAmountChange(index, value, true);
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
                                      control.setValue(`lines.${index}.debitAmount`, 0);
                                      handleAmountChange(index, value, false);
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
                                  placeholder="Line note"
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
                  <p className="text-lg font-semibold">{totalDebit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Credit</p>
                  <p className="text-lg font-semibold">{totalCredit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className={`text-lg font-semibold ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                    {difference.toFixed(2)}
                  </p>
                </div>
              </div>

              {!isBalanced && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Double-entry balance mismatch: Debits ({totalDebit.toFixed(2)}) must equal Credits ({totalCredit.toFixed(2)})
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || !isBalanced || fields.length < 2 || loadingAccounts}>
                {loading ? "Creating..." : "Create Contra Voucher"}
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
