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
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch, FiUser } from "react-icons/fi";
import { createVoucher } from "../../_actions/voucher.action";
import { getChartOfAccounts } from "../../../chart-of-accounts/_actions/chart-of-accounts.action";
import { getCashBankAccounts } from "../../../cash-bank/_actions/cash-bank.action";
import { getSuppliersForPurchase } from "../../../../procurements/purchases/_actions/purchase.action";
import { getClientsForSale } from "../../../../sales/_actions/sale.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType, AccountType } from "@prisma/client";

const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  debitAmount: z.number().min(0, "Debit amount must be >= 0").default(0),
  creditAmount: z.number().min(0, "Credit amount must be >= 0").default(0),
  description: z.string().optional(),
}).refine(
  (data) => {
    const hasDebit = data.debitAmount > 0;
    const hasCredit = data.creditAmount > 0;
    return (hasDebit && !hasCredit) || (!hasDebit && hasCredit);
  },
  {
    message: "Each line must have either debit OR credit (not both, not neither)",
    path: ["debitAmount"],
  }
);

const voucherFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
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

interface SupplierOption {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
}

interface ClientOption {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
}

interface CashBankAccountOption {
  id: string;
  chartOfAccountId: string;
  code: string;
  name: string;
  type: "CASH" | "BANK";
}

interface ReceiptPaymentFormProps {
  voucherType: "RECEIPT" | "PAYMENT";
}

export default function ReceiptPaymentForm({ voucherType }: ReceiptPaymentFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<CashBankAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");

  const isReceipt = voucherType === "RECEIPT";

  // Fetch accounts and suppliers for selection
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch all active accounts, suppliers, and clients
        const [accountsResult, cashBankResult, suppliersResult, clientsResult] = await Promise.all([
          getChartOfAccounts(1, 1000, "", "active"),
          getCashBankAccounts(),
          getSuppliersForPurchase(),
          getClientsForSale(),
        ]);

        if (accountsResult.success) {
          setAllAccounts(
            accountsResult.accounts.map((a: any) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type,
            }))
          );
        }

        if (cashBankResult.success && cashBankResult.accounts) {
          const cashBankOptions: CashBankAccountOption[] = [
            ...cashBankResult.accounts.cash.map((cb: any) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "CASH" as const,
            })),
            ...cashBankResult.accounts.bank.map((cb: any) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "BANK" as const,
            })),
          ];
          setCashBankAccounts(cashBankOptions);
        }

        if (suppliersResult.success) {
          setSuppliers(suppliersResult.suppliers);
        }

        if (clientsResult.success) {
          setClients(clientsResult.clients);
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchInitialData();
  }, []);

  // Filter counter accounts based on voucher type
  const getCounterAccounts = (): AccountOption[] => {
    if (isReceipt) {
      // Receipt: AR (ASSET with "receivable" in name/code), Income (REVENUE)
      return allAccounts.filter(
        (acc) => {
          const nameLower = acc.name.toLowerCase();
          const codeLower = acc.code.toLowerCase();
          return (
            (acc.type === AccountType.ASSET && (nameLower.includes("receivable") || nameLower.includes("ar") || codeLower.includes("ar"))) ||
            acc.type === AccountType.REVENUE
          );
        }
      );
    } else {
      // Payment: AP (LIABILITY with "payable" in name/code), Expense (EXPENSE)
      return allAccounts.filter(
        (acc) => {
          const nameLower = acc.name.toLowerCase();
          const codeLower = acc.code.toLowerCase();
          return (
            (acc.type === AccountType.LIABILITY && (nameLower.includes("payable") || nameLower.includes("ap") || codeLower.includes("ap"))) ||
            acc.type === AccountType.EXPENSE
          );
        }
      );
    }
  };

  const counterAccounts = getCounterAccounts();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherFormSchema as any),
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
  const firstLineAccountId = watch("lines.0.chartOfAccountId");

  // Auto-suggest first Cash/Bank account when available
  useEffect(() => {
    if (cashBankAccounts.length > 0 && !loadingAccounts && !firstLineAccountId) {
      const firstCashBank = cashBankAccounts[0];
      setValue("lines.0.chartOfAccountId", firstCashBank.chartOfAccountId, { shouldValidate: false });
    }
  }, [cashBankAccounts, setValue, loadingAccounts, firstLineAccountId]);

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

  // Auto-balance: When amount is entered in first line, auto-fill second line
  const handleAmountChange = (index: number, amount: number, isDebit: boolean) => {
    if (index === 0 && fields.length >= 2 && amount > 0) {
      // First line is Cash/Bank account
      if (isReceipt) {
        // Receipt: Cash/Bank DEBIT, Counter CREDIT
        if (isDebit) {
          setValue("lines.0.debitAmount", amount);
          setValue("lines.0.creditAmount", 0);
          setValue("lines.1.debitAmount", 0);
          setValue("lines.1.creditAmount", amount);
        }
      } else {
        // Payment: Cash/Bank CREDIT, Counter DEBIT
        if (!isDebit) {
          setValue("lines.0.debitAmount", 0);
          setValue("lines.0.creditAmount", amount);
          setValue("lines.1.debitAmount", amount);
          setValue("lines.1.creditAmount", 0);
        }
      }
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
        type: voucherType,
        description: data.description || undefined,
        supplierId: data.supplierId || undefined,
        clientId: data.clientId || undefined,
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

  const getAccountOptions = (lineIndex: number): AccountOption[] => {
    if (lineIndex === 0) {
      // First line: Cash/Bank accounts only
      const cashBankAccountIds = cashBankAccounts.map((cb) => cb.chartOfAccountId);
      return allAccounts.filter((acc) => cashBankAccountIds.includes(acc.id));
    } else {
      // Other lines: Counter accounts
      return counterAccounts;
    }
  };

  // Filter accounts based on search term for a specific line
  const getFilteredAccountOptions = (lineIndex: number): AccountOption[] => {
    const accountOptions = getAccountOptions(lineIndex);
    if (!accountSearch) return accountOptions;
    const searchLower = accountSearch.toLowerCase();
    return accountOptions.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create {isReceipt ? "Receipt" : "Payment"} Voucher</CardTitle>
        <CardDescription>
          {isReceipt
            ? "Record money received. Cash/Bank account (Debit) vs Counter account (Credit)."
            : "Record money paid. Cash/Bank account (Credit) vs Counter account (Debit)."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit as any)}>
          <div className="space-y-6">
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
                placeholder="Voucher description..."
                {...register("description")}
                disabled={loading}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {!isReceipt && (
              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier (Optional)</Label>
                <Controller
                  name="supplierId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={loading || loadingAccounts}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier for AP tracking" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name || supplier.email} {supplier.company ? `(${supplier.company})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">Select a supplier if this payment is against an Accounts Payable balance.</p>
              </div>
            )}

            {isReceipt && (
              <div className="space-y-2">
                <Label htmlFor="clientId">Client (Optional)</Label>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={loading || loadingAccounts}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client for AR tracking" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name || client.email} {client.company ? `(${client.company})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">Select a client if this receipt is against an Accounts Receivable balance.</p>
              </div>
            )}

            {/* Voucher Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Voucher Lines *</Label>
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
                      <TableHead>Account</TableHead>
                      <TableHead className="w-32">Debit</TableHead>
                      <TableHead className="w-32">Credit</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const lineError = errors.lines?.[index];
                      const filteredAccountOptions = getFilteredAccountOptions(index);
                      const isCashBankLine = index === 0;
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
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
                                  <SelectTrigger>
                                    <SelectValue placeholder={isCashBankLine ? "Select Cash/Bank account" : "Select counter account"} />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    <div className="p-2">
                                      <div className="relative">
                                        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                                        <Input
                                          placeholder="Search accounts..."
                                          value={accountSearch}
                                          onChange={(e) => {
                                            setAccountSearch(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                            }
                                          }}
                                          className="pl-8 h-8 text-xs"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                      {filteredAccountOptions.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="text-left">
                                          {account.code} - {account.name}
                                        </SelectItem>
                                      ))}
                                    </div>
                                  </SelectContent>
                                </Select>
                              )}
                            />
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
                                  step="any"
                                  min="0"
                                  placeholder="0.00"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      setValue(`lines.${index}.creditAmount` as any, 0);
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
                                  step="any"
                                  min="0"
                                  placeholder="0.00"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      setValue(`lines.${index}.debitAmount` as any, 0);
                                      handleAmountChange(index, value, false);
                                    }
                                  }}
                                  disabled={loading}
                                />
                              )}
                            />
                            {lineError?.creditAmount && (
                              <p className="text-xs text-destructive mt-1">
                                {lineError.creditAmount.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`lines.${index}.description`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="text"
                                  placeholder="Line description"
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
              <Button type="submit" disabled={loading || !isBalanced || fields.length < 2}>
                {loading ? "Creating..." : `Create ${isReceipt ? "Receipt" : "Payment"} Voucher`}
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

