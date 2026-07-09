"use client";

import { useState, useEffect, useMemo } from "react";
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
import { FiAlertCircle, FiCheck, FiLoader, FiTrendingUp, FiTrendingDown, FiDollarSign, FiSearch } from "react-icons/fi";
import { getSuppliersForPayment, getSupplierFinancialInfo, getPaymentAccountsFromCOA } from "../../_actions/payment.action";
import { createVoucher, postVoucher } from "../../../_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";
import { format } from "date-fns";
import { PaymentAccountType } from "@/lib/payment-account-config";

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
  email: string | null;
  company: string | null;
  supplierCode: string | null;
  chartOfAccountId: string | null;
  chartOfAccountName: string | null;
}

interface PaymentAccountOption {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type?: PaymentAccountType;
}

interface SupplierFinancialInfo {
  totalPurchases: number;
  totalPayments: number;
  outstandingBalance: number;
  lastPurchaseDate: Date | null;
  lastPaymentDate: Date | null;
}

export default function PaymentVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<{
    cash: PaymentAccountOption[];
    bank: PaymentAccountOption[];
    digitalWallet: PaymentAccountOption[];
  }>({ cash: [], bank: [], digitalWallet: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [financialInfo, setFinancialInfo] = useState<SupplierFinancialInfo | null>(null);
  const [loadingFinancialInfo, setLoadingFinancialInfo] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");

  // Filtered suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const query = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query)) ||
        (s.company && s.company.toLowerCase().includes(query)) ||
        (s.supplierCode && s.supplierCode.toLowerCase().includes(query))
    );
  }, [suppliers, supplierSearch]);

  // Filtered payment accounts based on search
  const filteredPaymentAccounts = useMemo(() => {
    const filterList = (list: PaymentAccountOption[]) => {
      if (!accountSearch) return list;
      const query = accountSearch.toLowerCase();
      return list.filter(
        (a) =>
          a.code.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query)
      );
    };

    return {
      cash: filterList(paymentAccounts.cash),
      bank: filterList(paymentAccounts.bank),
      digitalWallet: filterList(paymentAccounts.digitalWallet),
    };
  }, [paymentAccounts, accountSearch]);

  // Fetch suppliers and payment accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersResult, paymentAccountsResult] = await Promise.all([
          getSuppliersForPayment(),
          getPaymentAccountsFromCOA(),
        ]);

        if (suppliersResult.success) {
          setSuppliers(suppliersResult.suppliers);
        }

        if (paymentAccountsResult.success && paymentAccountsResult.accounts) {
          // @ts-ignore - Ignoring strict type check for now to allow data flow
          setPaymentAccounts(paymentAccountsResult.accounts);
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
      
      // Fetch financial info for selected supplier
      if (supplier && supplier.chartOfAccountId) {
        setLoadingFinancialInfo(true);
        getSupplierFinancialInfo(supplier.id)
          .then((result) => {
            if (result.success && result.financialInfo) {
              setFinancialInfo(result.financialInfo);
            } else {
              setFinancialInfo(null);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch financial info:", err);
            setFinancialInfo(null);
          })
          .finally(() => {
            setLoadingFinancialInfo(false);
          });
      } else {
        setFinancialInfo(null);
      }
    } else {
      setSelectedSupplier(null);
      setFinancialInfo(null);
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

      // Get the payment account (Cash/Bank/Digital Wallet) from all categories
      const allPaymentAccounts = [
        ...paymentAccounts.cash,
        ...paymentAccounts.bank,
        ...paymentAccounts.digitalWallet,
      ];
      const paymentAccount = allPaymentAccounts.find((a) => a.id === data.paymentAccountId);
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
          chartOfAccountId: paymentAccount.id, // Use account ID directly (it's from COA)
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      onOpenChange={(open) => {
                        if (!open) setSupplierSearch("");
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                          <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                            <Input
                              placeholder="Filter suppliers..."
                              value={supplierSearch}
                              onChange={(e) => setSupplierSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-8 h-8 text-xs bg-muted/50"
                            />
                          </div>
                        </div>
                        <div className="pt-1">
                          {filteredSuppliers.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                              No suppliers found
                            </div>
                          ) : (
                            filteredSuppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                <span className="text-sm font-medium">
                                  {supplier.name || supplier.email}
                                  {supplier.company && ` (${supplier.company})`}
                                  {supplier.supplierCode && ` - ${supplier.supplierCode}`}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </div>
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
                      onOpenChange={(open) => {
                        if (!open) setAccountSearch("");
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment account" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                          <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                            <Input
                              placeholder="Filter payment accounts..."
                              value={accountSearch}
                              onChange={(e) => setAccountSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-8 h-8 text-xs bg-muted/50"
                            />
                          </div>
                        </div>
                        <div className="pt-1">
                          {filteredPaymentAccounts.cash.length === 0 &&
                           filteredPaymentAccounts.bank.length === 0 &&
                           filteredPaymentAccounts.digitalWallet.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                              No payment accounts found
                            </div>
                          ) : (
                            <>
                              {filteredPaymentAccounts.cash.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                                    CASH ACCOUNTS
                                  </div>
                                  {filteredPaymentAccounts.cash.map((account) => (
                                    <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                      <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {filteredPaymentAccounts.bank.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider mt-1">
                                    BANK ACCOUNTS
                                  </div>
                                  {filteredPaymentAccounts.bank.map((account) => (
                                    <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                      <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {filteredPaymentAccounts.digitalWallet.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider mt-1">
                                    DIGITAL WALLETS
                                  </div>
                                  {filteredPaymentAccounts.digitalWallet.map((account) => (
                                    <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                      <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.paymentAccountId && (
                  <p className="text-sm text-destructive">{errors.paymentAccountId.message}</p>
                )}
              </div>

            </div>

            {/* Supplier Financial Information */}
            {selectedSupplier && selectedSupplier.chartOfAccountId && (
              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FiDollarSign className="h-4 w-4" />
                  Supplier Financial Summary
                </h4>
                {loadingFinancialInfo ? (
                  <div className="flex items-center justify-center py-4">
                    <FiLoader className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading financial data...</span>
                  </div>
                ) : financialInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FiTrendingUp className="h-3 w-3" />
                        Total Purchases
                      </div>
                      <p className="text-lg font-semibold font-mono">৳{financialInfo.totalPurchases.toFixed(2)}</p>
                      {financialInfo.lastPurchaseDate && (
                        <p className="text-xs text-muted-foreground">
                          Last: {format(new Date(financialInfo.lastPurchaseDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FiTrendingDown className="h-3 w-3" />
                        Total Payments
                      </div>
                      <p className="text-lg font-semibold font-mono text-green-600">৳{financialInfo.totalPayments.toFixed(2)}</p>
                      {financialInfo.lastPaymentDate && (
                        <p className="text-xs text-muted-foreground">
                          Last: {format(new Date(financialInfo.lastPaymentDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FiDollarSign className="h-3 w-3" />
                        Outstanding Balance
                      </div>
                      <p className={`text-lg font-semibold font-mono ${financialInfo.outstandingBalance > 0 ? "text-red-600" : "text-gray-600"}`}>
                        ৳{financialInfo.outstandingBalance.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {financialInfo.outstandingBalance > 0 ? "Amount Due" : "No Outstanding"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No financial data available</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      step="any"
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
            {selectedSupplier?.chartOfAccountId && watchedAmount > 0 && (() => {
              const allPaymentAccounts = [
                ...paymentAccounts.cash,
                ...paymentAccounts.bank,
                ...paymentAccounts.digitalWallet,
              ];
              const selectedPaymentAccount = allPaymentAccounts.find(a => a.id === watch("paymentAccountId"));
              
              return selectedPaymentAccount ? (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">Accounting Preview</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>DR: {selectedSupplier.chartOfAccountName}</span>
                      <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CR: {selectedPaymentAccount.name}</span>
                      <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : null; // Return null if selectedPaymentAccount is not found
            })()}

            {/* Actions */}
            <div className="flex justify-end items-center gap-3 pt-4">
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
