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
import { 
  FiAlertCircle, 
  FiPlus, 
  FiTrash2, 
  FiSearch, 
  FiAlertTriangle, 
  FiInfo, 
  FiLoader,
  FiCopy 
} from "react-icons/fi";
import { getAccountsForExpenses } from "../../_actions/expenses.action";
import { createVoucher, postVoucher } from "../../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

// Voucher line schema
const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().optional(),
});

// Expense voucher schema
const expenseVoucherSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().optional().or(z.literal("")),
  creditAccountId: z.string().min(1, "Expense Account (Credit source) is required"),
  warehouseId: z.string().optional(),
  lines: z.array(voucherLineSchema).min(1, "At least 1 expense entry is required"),
});

type ExpenseVoucherFormData = z.infer<typeof expenseVoucherSchema>;

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string | null;
  isWarehouseSpecific?: boolean;
}

interface CreditAccounts {
  cash: AccountOption[];
  bank: AccountOption[];
  digitalWallet: AccountOption[];
}

export default function ExpensesVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<ExpenseVoucherFormData>({
    resolver: zodResolver(expenseVoucherSchema as any),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      reference: "",
      description: "",
      creditAccountId: "",
      lines: [
        { chartOfAccountId: "", amount: 0, description: "" },
      ],
    },
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccounts>({ cash: [], bank: [], digitalWallet: [] });
  const [debitAccounts, setDebitAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");
  const [creditAccountSearch, setCreditAccountSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  
  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getAccountsForExpenses();
        if (result.success) {
          setCreditAccounts(result.creditAccounts);
          setDebitAccounts(result.debitAccounts);

          if (result.isAdmin) {
            setIsAdmin(true);
            setWarehouses(result.warehouses || []);
            if (result.warehouses && result.warehouses.length > 0) {
              const defaultWh = result.userWarehouseId
                ? result.warehouses.find(w => w.id === result.userWarehouseId)?.id || result.warehouses[0].id
                : result.warehouses[0].id;
              setValue("warehouseId", defaultWh);
            }
          }

          // Select same warehouse first cash account by default
          const warehouseCash = result.creditAccounts.cash.find(acc => acc.isWarehouseSpecific);
          const defaultCash = warehouseCash || result.creditAccounts.cash[0];
          if (defaultCash) {
            setValue("creditAccountId", defaultCash.id);
          }
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
  }, [setValue]);

  // Filter debit accounts (expense accounts) based on search
  const filteredDebitAccounts = useMemo(() => {
    if (!accountSearch) return debitAccounts;
    const searchLower = accountSearch.toLowerCase();
    return debitAccounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [debitAccounts, accountSearch]);

  // Filter and group credit accounts (cash/bank) based on search
  const filteredCreditAccounts = useMemo(() => {
    const filterList = (list: AccountOption[]) => {
      if (!creditAccountSearch) return list;
      const searchLower = creditAccountSearch.toLowerCase();
      return list.filter(
        (account) =>
          account.code.toLowerCase().includes(searchLower) ||
          account.name.toLowerCase().includes(searchLower)
      );
    };

    return {
      cash: filterList(creditAccounts.cash),
      bank: filterList(creditAccounts.bank),
      digitalWallet: filterList(creditAccounts.digitalWallet),
    };
  }, [creditAccounts, creditAccountSearch]);

  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");
  const watchedCreditAccountId = watch("creditAccountId");

  // Calculate total expense amount
  const totalAmount = watchedLines.reduce((sum, line) => sum + (line.amount || 0), 0);

  const addLine = () => {
    append({
      chartOfAccountId: "",
      amount: 0,
      description: "",
    });
  };

  const removeLine = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const cloneLine = (index: number) => {
    const lineToClone = watchedLines[index];
    insert(index + 1, { ...lineToClone });
  };

  const handleLineKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (index === fields.length - 1) {
        addLine();
      }
    }
  };

  const onSubmit = async (data: ExpenseVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      // 1. Map dynamic expense entries as DEBITS (amount on debit side)
      const debitLines = data.lines.map((line, index) => ({
        lineNumber: index + 1,
        debitAmount: line.amount || 0,
        creditAmount: 0,
        description: line.description || data.description,
        chartOfAccountId: line.chartOfAccountId,
      }));

      // 2. Add the final balancing credit entry to the selected Cash/Bank account
      const creditLine = {
        lineNumber: debitLines.length + 1,
        debitAmount: 0,
        creditAmount: totalAmount,
        description: `Total expenses paid from ${
          creditAccounts.cash.find(a => a.id === data.creditAccountId)?.name || 
          creditAccounts.bank.find(a => a.id === data.creditAccountId)?.name || 
          creditAccounts.digitalWallet.find(a => a.id === data.creditAccountId)?.name || 
          "payment source"
        }`,
        chartOfAccountId: data.creditAccountId,
      };

      const lines = [...debitLines, creditLine];

      // Create the voucher (using PAYMENT type internally for cash disbursement)
      const createResult = await createVoucher({
        date: data.date,
        type: VoucherType.PAYMENT,
        reference: data.reference || undefined,
        description: data.description,
        warehouseId: isAdmin ? data.warehouseId : undefined,
        lines,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create expense voucher");
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                Expense Voucher
                <Badge variant="outline" className="font-normal bg-amber-50 dark:bg-amber-950 text-amber-600">Expenses</Badge>
              </CardTitle>
              <CardDescription>
                Create simplified expense records. Enter the paid amounts, and the total will be credited to the selected account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <div className="space-y-6">
              {/* Context Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs uppercase tracking-wide">Expense Rules</p>
                    <p className="text-xs mt-1">
                      Expense Account selected in the header acts as the credit source (Cash, Bank, Petty Cash). All line amounts are debited to their respective Expense accounts.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs uppercase tracking-wide">Usage Pro-tip</p>
                    <p className="text-xs mt-1">
                      Press <b>Enter</b> on the last amount field to add a new line. The balancing credit line is calculated automatically.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Header Fields (3 or 4 columns depending on Admin status) */}
              <div className={`grid gap-4 sm:grid-cols-1 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="warehouseId">Warehouse *</Label>
                    <Controller
                      name="warehouseId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}

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
                    placeholder="e.g., EXP-2025-001"
                    {...register("reference")}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditAccountId">Expense Account *</Label>
                  <Controller
                    name="creditAccountId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-full border-muted-foreground/20 focus:ring-1 focus:ring-ring">
                          <SelectValue placeholder="Select Credit Account" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px]">
                          <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                            <div className="relative">
                              <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                              <Input
                                placeholder="Filter credit accounts..."
                                value={creditAccountSearch}
                                onChange={(e) => setCreditAccountSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="pl-8 h-8 text-xs bg-muted/50"
                              />
                            </div>
                          </div>
                          <div className="pt-1">
                            {/* Cash Accounts */}
                            {filteredCreditAccounts.cash.length > 0 && (
                              <div>
                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                                  Cash Accounts
                                </div>
                                {filteredCreditAccounts.cash.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                  </SelectItem>
                                ))}
                              </div>
                            )}

                            {/* Bank Accounts */}
                            {filteredCreditAccounts.bank.length > 0 && (
                              <div>
                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                                  Bank Accounts
                                </div>
                                {filteredCreditAccounts.bank.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                  </SelectItem>
                                ))}
                              </div>
                            )}

                            {/* Digital Wallet Accounts */}
                            {filteredCreditAccounts.digitalWallet.length > 0 && (
                              <div>
                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                                  Digital Wallet Accounts
                                </div>
                                {filteredCreditAccounts.digitalWallet.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                  </SelectItem>
                                ))}
                              </div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.creditAccountId && (
                    <p className="text-sm text-destructive">{errors.creditAccountId.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., General office expense payment"
                  {...register("description")}
                  disabled={loading}
                  rows={2}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Journal Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Entries</Label>
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

                <div className="border rounded-lg overflow-hidden bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[5%] text-center">#</TableHead>
                        <TableHead className="w-[35%]">Account</TableHead>
                        <TableHead className="w-[15%] text-right font-semibold">Amount (Debit)</TableHead>
                        <TableHead className="w-[35%]">Note</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const lineError = errors.lines?.[index];
                        const selectedAccountId = watchedLines[index]?.chartOfAccountId;
                        const selectedAccount = debitAccounts.find(acc => acc.id === selectedAccountId);

                        return (
                          <TableRow key={field.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
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
                                      <SelectTrigger className="w-full border-muted-foreground/20 focus:ring-1 focus:ring-ring">
                                        <SelectValue placeholder="Select account" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[400px]">
                                        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                          <div className="relative">
                                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                                            <Input
                                              placeholder="Filter expense accounts..."
                                              value={accountSearch}
                                              onChange={(e) => setAccountSearch(e.target.value)}
                                              onKeyDown={(e) => e.stopPropagation()}
                                              className="pl-8 h-8 text-xs bg-muted/50"
                                            />
                                          </div>
                                        </div>
                                        <div className="pt-1">
                                          <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                                            Expense Accounts Only
                                          </div>
                                          {filteredDebitAccounts.map((account) => (
                                            <SelectItem
                                              key={account.id}
                                              value={account.id}
                                              className="text-left cursor-pointer py-2 focus:bg-accent"
                                            >
                                              <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                            </SelectItem>
                                          ))}
                                        </div>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>
                              {lineError?.chartOfAccountId && (
                                <p className="text-[10px] text-destructive mt-1 font-medium bg-destructive/5 inline-block px-1 rounded">
                                  {lineError.chartOfAccountId.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.amount`}
                                control={control}
                                render={({ field }) => (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="0.00"
                                      className="text-right font-mono focus:bg-background bg-muted/20"
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        field.onChange(value);
                                      }}
                                      onKeyDown={(e) => handleLineKeyDown(e, index)}
                                      onFocus={(e) => e.target.select()}
                                      disabled={loading}
                                    />
                                  </div>
                                )}
                              />
                              {lineError?.amount && (
                                <p className="text-[10px] text-destructive text-right mt-1">{lineError.amount.message}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                {...register(`lines.${index}.description`)}
                                placeholder="Note..."
                                className="text-xs"
                                disabled={loading}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if(index === fields.length - 1) addLine();
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => cloneLine(index)}
                                  disabled={loading}
                                  title="Clone Line"
                                >
                                  <FiCopy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removeLine(index)}
                                  disabled={loading || fields.length <= 1}
                                  title="Remove Line"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Sticky Footer for Totals & Actions */}
            <div className="p-6 bg-background/95 backdrop-blur border-t z-10  mt-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Totals Section */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center md:text-left">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Total Debit (Expense)</p>
                    <p className="font-mono font-bold text-lg">৳{totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="pl-6 border-l">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Automatic Credit Total</p>
                    <p className="font-mono font-bold text-lg text-green-600">৳{totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* Main Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                   <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="min-w-[150px]"
                    disabled={loading || !watchedCreditAccountId || totalAmount === 0 || fields.length < 1}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Create Expense Voucher"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
