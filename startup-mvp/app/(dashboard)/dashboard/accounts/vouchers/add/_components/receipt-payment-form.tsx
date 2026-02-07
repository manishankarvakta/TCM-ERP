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
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch, FiDollarSign } from "react-icons/fi";
import { createVoucher } from "../../_actions/voucher.action";
import { getChartOfAccounts } from "../../../chart-of-accounts/_actions/chart-of-accounts.action";
import { getCashBankAccounts } from "../../../cash-bank/_actions/cash-bank.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType, AccountType } from "@prisma/client";

// Schema for counter lines only (the dynamic list)
const counterLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
});

// Master schema
const voucherFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().optional().or(z.literal("")),
  mainAccountId: z.string().min(1, "Main account is required"), // Cash/Bank account
  counterLines: z.array(counterLineSchema).min(1, "At least 1 line is required"),
});

type VoucherFormData = z.infer<typeof voucherFormSchema>;

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface CashBankAccountOption {
  id: string;
  chartOfAccountId: string;
  code: string;
  name: string;
  type: "CASH" | "BANK";
}

interface ReceiptPaymentFormProps {
  voucherType: VoucherType.RECEIPT | VoucherType.PAYMENT;
}

export default function ReceiptPaymentForm({ voucherType }: ReceiptPaymentFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<CashBankAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");

  const isReceipt = voucherType === VoucherType.RECEIPT;
  const themeColor = isReceipt ? "green" : "red";

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const [accountsResult, cashBankResult] = await Promise.all([
          getChartOfAccounts(1, 1000, "", "active"),
          getCashBankAccounts(),
        ]);

        if (accountsResult.success) {
          setAllAccounts(
            accountsResult.accounts.map((a) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type,
            }))
          );
        }

        if (cashBankResult.success && cashBankResult.accounts) {
          const cashBankOptions: CashBankAccountOption[] = [
            ...cashBankResult.accounts.cash.map((cb) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "CASH" as const,
            })),
            ...cashBankResult.accounts.bank.map((cb) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "BANK" as const,
            })),
          ];
          setCashBankAccounts(cashBankOptions);
        }
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  // Filter counter accounts based on voucher type logic
  const counterAccounts = useMemo(() => {
     if (isReceipt) {
      // For Receipt: Show Income, Assets (Receivables), Liabilities (Customer Advances)
      // Broadly filtering for relevant types to be helpful but not overly restrictive
      return allAccounts.filter(acc => 
        acc.type === AccountType.REVENUE || 
        acc.type === AccountType.ASSET || 
        acc.type === AccountType.LIABILITY ||
        acc.type === AccountType.EQUITY
      );
    } else {
      // For Payment: Show Expenses, Liabilities (Payables), Assets (Prepayments/Assets purchase)
      return allAccounts.filter(acc => 
        acc.type === AccountType.EXPENSE || 
        acc.type === AccountType.LIABILITY || 
        acc.type === AccountType.ASSET ||
        acc.type === AccountType.EQUITY
      );
    }
  }, [allAccounts, isReceipt]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch,
  } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      mainAccountId: "",
      counterLines: [
        { chartOfAccountId: "", amount: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "counterLines",
  });

  const watchedCounterLines = watch("counterLines");
  
  // Auto-select first cash/bank account if available
  useEffect(() => {
    if (cashBankAccounts.length > 0 && !watch("mainAccountId")) {
      setValue("mainAccountId", cashBankAccounts[0].chartOfAccountId);
    }
  }, [cashBankAccounts, setValue, watch]);

  // Calculate total
  const totalAmount = watchedCounterLines.reduce((sum, line) => sum + (line.amount || 0), 0);

  const onSubmit = async (data: VoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      // Transform into standard voucher lines
      // Line 1: Main Account (Cash/Bank)
      //    - Receipt: DEBIT total
      //    - Payment: CREDIT total
      const mainLine = {
        lineNumber: 1,
        chartOfAccountId: data.mainAccountId,
        debitAmount: isReceipt ? totalAmount : 0,
        creditAmount: isReceipt ? 0 : totalAmount,
        description: isReceipt ? "Total Receipt" : "Total Payment",
      };

      // Subsequent Lines: Counter Accounts
      //    - Receipt: CREDIT each line amount
      //    - Payment: DEBIT each line amount
      const otherLines = data.counterLines.map((line, index) => ({
        lineNumber: index + 2,
        chartOfAccountId: line.chartOfAccountId,
        debitAmount: isReceipt ? 0 : line.amount,
        creditAmount: isReceipt ? line.amount : 0,
        description: line.description || undefined,
      }));

      const lines = [mainLine, ...otherLines];

      const result = await createVoucher({
        date: data.date,
        type: voucherType,
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

  const filteredCounterAccounts = useMemo(() => {
      if (!accountSearch) return counterAccounts;
      const searchLower = accountSearch.toLowerCase();
      return counterAccounts.filter(
        (account) =>
          account.code.toLowerCase().includes(searchLower) ||
          account.name.toLowerCase().includes(searchLower)
      );
  }, [counterAccounts, accountSearch]);


  return (
    <Card className={`border-t-4 ${isReceipt ? "border-t-green-500" : "border-t-red-500"} shadow-md`}>
      <CardHeader>
        <CardTitle>{isReceipt ? "Received Money (Receipt)" : "Payment Out (Payment)"}</CardTitle>
        <CardDescription>
          {isReceipt
            ? "Record money received into a Cash/Bank account."
            : "Record money paid from a Cash/Bank account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="space-y-2">
              <Label htmlFor="mainAccountId">
                {isReceipt ? "Deposit To (Debit)" : "Pay From (Credit)"}
              </Label>
              <Controller
                name="mainAccountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading || loadingAccounts}
                  >
                    <SelectTrigger className="bg-muted/30 font-medium">
                      <SelectValue placeholder="Select Cash/Bank Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashBankAccounts.map((account) => (
                        <SelectItem key={account.chartOfAccountId} value={account.chartOfAccountId}>
                          {account.name} <span className="text-muted-foreground text-xs">({account.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.mainAccountId && (
                <p className="text-sm text-destructive">{errors.mainAccountId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between border-b pb-2">
                <Label className="text-base font-semibold">
                    {isReceipt ? "Received From / Revenue Sources" : "Paid To / Expenses"}
                </Label>
                <div className="text-sm font-medium">
                    Total: <span className={`${isReceipt ? "text-green-600" : "text-red-600"} font-bold`}>{totalAmount.toFixed(2)}</span>
                </div>
             </div>
             
             {errors.counterLines && (
                  <p className="text-sm text-destructive">{errors.counterLines.message}</p>
             )}

             <div className="space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-gray-50/50 p-3 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
                         <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0">
                             {index + 1}
                         </div>
                         
                         <div className="flex-1 w-full md:w-auto space-y-1">
                             <div className="flex flex-col space-y-1">
                                <Label className="sr-only">Account</Label>
                                <Controller
                                    name={`counterLines.${index}.chartOfAccountId`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={loading}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select Account" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                 <div className="p-2 sticky top-0 bg-popover z-10 pb-2 border-b mb-1">
                                                    <div className="relative">
                                                        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                                                        <Input
                                                          placeholder="Search accounts..."
                                                          value={accountSearch}
                                                          onChange={(e) => setAccountSearch(e.target.value)}
                                                          className="pl-8 h-8 text-xs"
                                                          onKeyDown={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                {filteredCounterAccounts.map((acc) => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name} <span className="text-muted-foreground text-xs">({acc.code})</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.counterLines?.[index]?.chartOfAccountId && (
                                    <p className="text-[10px] text-destructive">{errors.counterLines[index]?.chartOfAccountId?.message}</p>
                                )}
                             </div>
                         </div>

                         <div className="w-full md:w-32">
                             <Label className="sr-only">Amount</Label>
                             <div className="relative">
                                <FiDollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="pl-7 h-9 text-right font-medium"
                                    {...register(`counterLines.${index}.amount`, { valueAsNumber: true })}
                                />
                             </div>
                              {errors.counterLines?.[index]?.amount && (
                                    <p className="text-[10px] text-destructive mt-0.5 text-right">{errors.counterLines[index]?.amount?.message}</p>
                                )}
                         </div>

                         <div className="w-full md:w-1/3">
                             <Label className="sr-only">Description</Label>
                             <Input 
                                placeholder="Description (optional)" 
                                className="h-9 text-sm"
                                {...register(`counterLines.${index}.description`)}
                             />
                         </div>

                         {fields.length > 1 && (
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
                             >
                                <FiTrash2 className="w-4 h-4" />
                             </Button>
                         )}
                    </div>
                ))}
             </div>

             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ chartOfAccountId: "", amount: 0, description: "" })}
                className="mt-2 text-xs"
             >
                <FiPlus className="mr-1.5 w-3.5 h-3.5" />
                Add Another Line
             </Button>
          </div>

          <div className="space-y-2">
              <Label htmlFor="description">Main Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Overall voucher description... (e.g. Monthly Rent Payment)"
                {...register("description")}
                disabled={loading}
                rows={2}
              />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button type="submit" disabled={loading} className={`min-w-[150px] ${isReceipt ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}>
              {loading ? "Processing..." : `Create ${isReceipt ? "Receipt" : "Payment"}`}
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
        </form>
      </CardContent>
    </Card>
  );
}
