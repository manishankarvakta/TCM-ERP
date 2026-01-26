"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { FiAlertCircle, FiArrowRight, FiLoader } from "react-icons/fi";
import { getCashBankAccounts } from "../../../cash-bank/_actions/cash-bank.action";
import { createVoucher, postVoucher } from "../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

// Form validation schema with refinement for From ≠ To
const contraVoucherSchema = z.object({
  fromAccountId: z.string().min(1, "From account is required"),
  toAccountId: z.string().min(1, "To account is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "From and To accounts must be different",
  path: ["toAccountId"],
});

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
  const [loadingData, setLoadingData] = useState(true);

  // Fetch cash/bank accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cashBankResult = await getCashBankAccounts();

        if (cashBankResult.success && cashBankResult.accounts) {
          const allAccounts: CashBankAccountOption[] = [
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
          setCashBankAccounts(allAccounts);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load form data. Please refresh the page.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
  } = useForm<ContraVoucherFormData>({
    resolver: zodResolver(contraVoucherSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      fromAccountId: "",
      toAccountId: "",
      amount: 0,
      reference: "",
      description: "",
    },
  });

  const watchedFromAccountId = watch("fromAccountId");
  const watchedToAccountId = watch("toAccountId");
  const watchedAmount = watch("amount");

  const fromAccount = cashBankAccounts.find((a) => a.chartOfAccountId === watchedFromAccountId);
  const toAccount = cashBankAccounts.find((a) => a.chartOfAccountId === watchedToAccountId);

  const onSubmit = async (data: ContraVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      // Get the accounts
      const fromAcc = cashBankAccounts.find((a) => a.chartOfAccountId === data.fromAccountId);
      const toAcc = cashBankAccounts.find((a) => a.chartOfAccountId === data.toAccountId);

      if (!fromAcc || !toAcc) {
        throw new Error("Invalid account selection");
      }

      // Build voucher lines (DR To, CR From)
      const lines = [
        {
          lineNumber: 1,
          debitAmount: data.amount,
          creditAmount: 0,
          description: `Transfer to ${toAcc.name}`,
          chartOfAccountId: toAcc.chartOfAccountId,
        },
        {
          lineNumber: 2,
          debitAmount: 0,
          creditAmount: data.amount,
          description: `Transfer from ${fromAcc.name}`,
          chartOfAccountId: fromAcc.chartOfAccountId,
        },
      ];

      // Create the voucher
      const createResult = await createVoucher({
        date: data.date,
        type: VoucherType.CONTRA,
        reference: data.reference || undefined,
        description: data.description || `Fund transfer: ${fromAcc.name} → ${toAcc.name}`,
        lines,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create contra voucher");
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

  if (loadingData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <FiLoader className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading form data...</span>
        </CardContent>
      </Card>
    );
  }

  const renderAccountSelect = (
    name: "fromAccountId" | "toAccountId",
    label: string,
    placeholder: string,
    excludeAccountId?: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label} *</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {cashBankAccounts.length === 0 ? (
                <SelectItem value="none" disabled>
                  No Cash/Bank accounts available
                </SelectItem>
              ) : (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                    CASH ACCOUNTS
                  </div>
                  {cashBankAccounts
                    .filter((acc) => acc.type === "CASH" && acc.chartOfAccountId !== excludeAccountId)
                    .map((account) => (
                      <SelectItem key={account.chartOfAccountId} value={account.chartOfAccountId}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-t mt-1">
                    BANK ACCOUNTS
                  </div>
                  {cashBankAccounts
                    .filter((acc) => acc.type === "BANK" && acc.chartOfAccountId !== excludeAccountId)
                    .map((account) => (
                      <SelectItem key={account.chartOfAccountId} value={account.chartOfAccountId}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                </>
              )}
            </SelectContent>
          </Select>
        )}
      />
      {errors[name] && (
        <p className="text-sm text-destructive">{errors[name]?.message}</p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Contra Voucher</CardTitle>
        <CardDescription>
          Transfer funds between Cash and Bank accounts. This will debit the destination account and credit the source account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* From Account Selection */}
            {renderAccountSelect(
              "fromAccountId",
              "From Account (Source)",
              "Select source account",
              watchedToAccountId
            )}

            {/* To Account Selection */}
            {renderAccountSelect(
              "toAccountId",
              "To Account (Destination)",
              "Select destination account",
              watchedFromAccountId
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      field.onChange(value);
                    }}
                    disabled={loading}
                  />
                )}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Transfer Date *</Label>
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

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                type="text"
                placeholder="e.g., Transfer slip number"
                {...register("reference")}
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional notes..."
                {...register("description")}
                disabled={loading}
                rows={3}
              />
            </div>

            {/* Preview */}
            {fromAccount && toAccount && watchedAmount > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-medium mb-3">Transfer Preview</h4>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">FROM</div>
                    <div className="font-medium">{fromAccount.name}</div>
                    <div className="text-xs text-muted-foreground">{fromAccount.type}</div>
                  </div>
                  <FiArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">TO</div>
                    <div className="font-medium">{toAccount.name}</div>
                    <div className="text-xs text-muted-foreground">{toAccount.type}</div>
                  </div>
                </div>
                <div className="text-sm space-y-1 border-t pt-3">
                  <div className="flex justify-between">
                    <span>DR: {toAccount.name}</span>
                    <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CR: {fromAccount.name}</span>
                    <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !fromAccount || !toAccount || watchedFromAccountId === watchedToAccountId}
              >
                {loading ? (
                  <>
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                    Creating & Posting...
                  </>
                ) : (
                  "Create & Post Transfer"
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
