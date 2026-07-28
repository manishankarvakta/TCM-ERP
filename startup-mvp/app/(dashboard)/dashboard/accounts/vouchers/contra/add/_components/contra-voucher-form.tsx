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
import { FiAlertCircle, FiArrowRight, FiLoader, FiDollarSign, FiSearch } from "react-icons/fi";
import { getContraAccounts, getAccountBalance } from "../../_actions/contra.action";
import { createVoucher, postVoucher } from "../../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";
import { PaymentAccountType } from "@/lib/payment-account-config";

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

interface ContraAccountOption {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type?: PaymentAccountType;
}

export default function ContraVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [contraAccounts, setContraAccounts] = useState<{
    cash: ContraAccountOption[];
    bank: ContraAccountOption[];
    digitalWallet: ContraAccountOption[];
  }>({ cash: [], bank: [], digitalWallet: [] });
  const [loadingData, setLoadingData] = useState(true);
  
  // Balance states
  const [fromAccountBalance, setFromAccountBalance] = useState<number | null>(null);
  const [toAccountBalance, setToAccountBalance] = useState<number | null>(null);
  const [loadingFromBalance, setLoadingFromBalance] = useState(false);
  const [loadingToBalance, setLoadingToBalance] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");

  // Fetch contra accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getContraAccounts();
        if (result.success && result.accounts) {
          // @ts-ignore
          setContraAccounts(result.accounts);
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

  // Helper to find account details
  const getAccountDetails = (id: string) => {
    const allAccounts = [
      ...contraAccounts.cash,
      ...contraAccounts.bank,
      ...contraAccounts.digitalWallet,
    ];
    return allAccounts.find(a => a.id === id);
  };

  const fromAccount = getAccountDetails(watchedFromAccountId);
  const toAccount = getAccountDetails(watchedToAccountId);

  // Fetch balance when From account changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (watchedFromAccountId) {
        setLoadingFromBalance(true);
        try {
          const result = await getAccountBalance(watchedFromAccountId);
          if (result.success) {
            setFromAccountBalance(result.balance);
          }
        } catch (error) {
          console.error("Error fetching balance", error);
        } finally {
          setLoadingFromBalance(false);
        }
      } else {
        setFromAccountBalance(null);
      }
    };
    fetchBalance();
  }, [watchedFromAccountId]);

  // Fetch balance when To account changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (watchedToAccountId) {
        setLoadingToBalance(true);
        try {
          const result = await getAccountBalance(watchedToAccountId);
          if (result.success) {
            setToAccountBalance(result.balance);
          }
        } catch (error) {
          console.error("Error fetching balance", error);
        } finally {
          setLoadingToBalance(false);
        }
      } else {
        setToAccountBalance(null);
      }
    };
    fetchBalance();
  }, [watchedToAccountId]);


  const onSubmit = async (data: ContraVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      const fromAcc = getAccountDetails(data.fromAccountId);
      const toAcc = getAccountDetails(data.toAccountId);

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
          chartOfAccountId: toAcc.id,
        },
        {
          lineNumber: 2,
          debitAmount: 0,
          creditAmount: data.amount,
          description: `Transfer from ${fromAcc.name}`,
          chartOfAccountId: fromAcc.id,
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
    excludeAccountId?: string,
    balance?: number | null,
    loadingBalance?: boolean
  ) => {
    const searchQuery = name === "fromAccountId" ? fromSearch : toSearch;
    const setSearchQuery = name === "fromAccountId" ? setFromSearch : setToSearch;

    const filterList = (list: ContraAccountOption[]) => {
      let result = list.filter((acc) => acc.id !== excludeAccountId);
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(
          (acc) =>
            acc.code.toLowerCase().includes(query) ||
            acc.name.toLowerCase().includes(query)
        );
      }
      return result;
    };

    const cashAccounts = filterList(contraAccounts.cash);
    const bankAccounts = filterList(contraAccounts.bank);
    const walletAccounts = filterList(contraAccounts.digitalWallet);

    const hasAccounts = cashAccounts.length > 0 || bankAccounts.length > 0 || walletAccounts.length > 0;

    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label} *</Label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              onOpenChange={(open) => {
                if (!open) setSearchQuery("");
              }}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                  <div className="relative">
                    <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                    <Input
                      placeholder="Filter accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="pl-8 h-8 text-xs bg-muted/50"
                    />
                  </div>
                </div>
                <div className="pt-1">
                  {!hasAccounts ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                      No accounts found
                    </div>
                  ) : (
                    <>
                      {cashAccounts.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                            CASH ACCOUNTS
                          </div>
                          {cashAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                              <span className="text-sm font-medium">{account.code} - {account.name}</span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {bankAccounts.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider mt-1">
                            BANK ACCOUNTS
                          </div>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                              <span className="text-sm font-medium">{account.code} - {account.name}</span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {walletAccounts.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider mt-1">
                            DIGITAL WALLETS
                          </div>
                          {walletAccounts.map((account) => (
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
        
        {/* Balance Display */}
        {fieldBalanceDisplay(balance, loadingBalance)}

        {errors[name] && (
          <p className="text-sm text-destructive">{errors[name]?.message}</p>
        )}
      </div>
    );
  };

  const fieldBalanceDisplay = (balance: number | null | undefined, isLoading: boolean | undefined) => {
    if (isLoading) {
      return (
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <FiLoader className="h-3 w-3 animate-spin" /> Fetching balance...
        </div>
      );
    }
    if (balance !== null && balance !== undefined) {
      return (
        <div className="text-xs font-medium mt-1 flex items-center gap-1">
          <span className="text-muted-foreground">Current Balance:</span>
          <span className={balance < 0 ? "text-red-500" : "text-green-600"}>
            ৳{balance.toFixed(2)}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Contra Voucher</CardTitle>
        <CardDescription>
          Transfer funds between Cash, Bank, and Digital Wallet accounts. This will debit the destination account and credit the source account.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Account Selection */}
              {renderAccountSelect(
                "fromAccountId",
                "From Account (Source)",
                "Select source account",
                watchedToAccountId,
                fromAccountBalance,
                loadingFromBalance
              )}

              {/* To Account Selection */}
              {renderAccountSelect(
                "toAccountId",
                "To Account (Destination)",
                "Select destination account",
                watchedFromAccountId,
                toAccountBalance,
                loadingToBalance
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">৳</span>
                  <Input
                    id="amount"
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-8"
                    value={watch("amount") || ""}
                    {...register("amount", { valueAsNumber: true })}
                    disabled={loading}
                  />
                </div>
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
                    <div className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-red-100 text-red-700 inline-block mt-1">Sent</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-sm font-bold text-blue-600 mb-1">৳{watchedAmount.toFixed(2)}</div>
                    <FiArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">TO</div>
                    <div className="font-medium">{toAccount.name}</div>
                    <div className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-green-100 text-green-700 inline-block mt-1">Received</div>
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
            <div className="flex items-center justify-end gap-3 pt-4">
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
