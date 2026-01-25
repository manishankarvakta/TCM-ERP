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
import { FiAlertCircle, FiCheck, FiLoader } from "react-icons/fi";
import { getSuppliersForPayment } from "../../_actions/payment.action";
import { getCashBankAccounts } from "../../../cash-bank/_actions/cash-bank.action";
import { createVoucher, postVoucher } from "../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

// Form validation schema
const paymentVoucherSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  paymentAccountId: z.string().min(1, "Payment account is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().optional(),
});

type PaymentVoucherFormData = z.infer<typeof paymentVoucherSchema>;

interface SupplierOption {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  supplierCode: string | null;
  chartOfAccountId: string | null;
  chartOfAccountName: string | null;
}

interface CashBankAccountOption {
  id: string;
  chartOfAccountId: string;
  code: string;
  name: string;
  type: "CASH" | "BANK";
}

export default function PaymentVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<CashBankAccountOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);

  // Fetch suppliers and cash/bank accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersResult, cashBankResult] = await Promise.all([
          getSuppliersForPayment(),
          getCashBankAccounts(),
        ]);

        if (suppliersResult.success) {
          setSuppliers(suppliersResult.suppliers);
        }

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
    setValue,
  } = useForm<PaymentVoucherFormData>({
    resolver: zodResolver(paymentVoucherSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      supplierId: "",
      paymentAccountId: "",
      amount: 0,
      reference: "",
      description: "",
    },
  });

  const watchedSupplierId = watch("supplierId");
  const watchedAmount = watch("amount");

  // Update selected supplier when supplierId changes
  useEffect(() => {
    if (watchedSupplierId) {
      const supplier = suppliers.find((s) => s.id === watchedSupplierId);
      setSelectedSupplier(supplier || null);
    } else {
      setSelectedSupplier(null);
    }
  }, [watchedSupplierId, suppliers]);

  const onSubmit = async (data: PaymentVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      // Get the selected supplier's AP account
      const supplier = suppliers.find((s) => s.id === data.supplierId);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      if (!supplier.chartOfAccountId) {
        throw new Error("Supplier does not have an AP account. Please update the supplier first.");
      }

      // Get the payment account (Cash/Bank)
      const paymentAccount = cashBankAccounts.find((a) => a.chartOfAccountId === data.paymentAccountId);
      if (!paymentAccount) {
        throw new Error("Payment account not found");
      }

      // Build voucher lines (DR AP, CR Cash/Bank)
      const lines = [
        {
          lineNumber: 1,
          debitAmount: data.amount,
          creditAmount: 0,
          description: `Payment to ${supplier.name || supplier.email}`,
          chartOfAccountId: supplier.chartOfAccountId,
          supplierId: supplier.id,
        },
        {
          lineNumber: 2,
          debitAmount: 0,
          creditAmount: data.amount,
          description: `Payment from ${paymentAccount.name}`,
          chartOfAccountId: paymentAccount.chartOfAccountId,
        },
      ];

      // Create the voucher
      const createResult = await createVoucher({
        date: data.date,
        type: VoucherType.PAYMENT,
        reference: data.reference || undefined,
        description: data.description || `Payment to ${supplier.name || supplier.email}`,
        supplierId: supplier.id,
        lines,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create payment voucher");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Payment Voucher</CardTitle>
        <CardDescription>
          Record a payment to a supplier. This will debit the supplier&apos;s AP account and credit your Cash/Bank account.
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

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label htmlFor="supplierId">Supplier *</Label>
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No suppliers available
                        </SelectItem>
                      ) : (
                        suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name || supplier.email}
                            {supplier.company && ` (${supplier.company})`}
                            {supplier.supplierCode && ` - ${supplier.supplierCode}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplierId && (
                <p className="text-sm text-destructive">{errors.supplierId.message}</p>
              )}
              {selectedSupplier && (
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedSupplier.chartOfAccountId ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <FiCheck className="h-3 w-3" />
                      AP Account: {selectedSupplier.chartOfAccountName}
                    </span>
                  ) : (
                    <span className="text-destructive">
                      Warning: This supplier does not have an AP account
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Payment Account Selection */}
            <div className="space-y-2">
              <Label htmlFor="paymentAccountId">Payment Account (Cash/Bank) *</Label>
              <Controller
                name="paymentAccountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment account" />
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
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentAccountId && (
                <p className="text-sm text-destructive">{errors.paymentAccountId.message}</p>
              )}
            </div>

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
              <Label htmlFor="date">Payment Date *</Label>
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
                placeholder="e.g., Invoice number, Check number"
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
            {selectedSupplier?.chartOfAccountId && watchedAmount > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Accounting Preview</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>DR: {selectedSupplier.chartOfAccountName}</span>
                    <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CR: {cashBankAccounts.find(a => a.chartOfAccountId === watch("paymentAccountId"))?.name || "Cash/Bank"}</span>
                    <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !selectedSupplier?.chartOfAccountId}
              >
                {loading ? (
                  <>
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                    Creating & Posting...
                  </>
                ) : (
                  "Create & Post Payment"
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
