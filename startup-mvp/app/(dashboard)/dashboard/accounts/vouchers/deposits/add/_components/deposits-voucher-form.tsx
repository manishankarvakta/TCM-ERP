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
import { FiAlertCircle, FiLoader, FiSave, FiTrendingUp, FiSearch } from "react-icons/fi";
import { getContraAccounts, getAccountBalance } from "../../../contra/_actions/contra.action";
import { createVoucher, postVoucher } from "../../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

// Form validation schema with refinement for From ≠ To
const depositVoucherSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  toAccountId: z.string().min(1, "Destination account is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Source and Destination accounts must be different",
  path: ["toAccountId"],
});

type DepositVoucherFormData = z.infer<typeof depositVoucherSchema>;

interface AccountOption {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface AccountGroup {
  cash: AccountOption[];
  bank: AccountOption[];
  digitalWallet: AccountOption[];
}

export default function DepositsVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [contraAccounts, setContraAccounts] = useState<AccountGroup>({ cash: [], bank: [], digitalWallet: [] });
  const [destinationAccounts, setDestinationAccounts] = useState<AccountGroup>({ cash: [], bank: [], digitalWallet: [] });
  const [loadingData, setLoadingData] = useState(true);
  
  // Balance states
  const [fromAccountBalance, setFromAccountBalance] = useState<number | null>(null);
  const [toAccountBalance, setToAccountBalance] = useState<number | null>(null);
  const [loadingFromBalance, setLoadingFromBalance] = useState(false);
  const [loadingToBalance, setLoadingToBalance] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");

  // Fetch accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getContraAccounts();
        if (result.success && result.accounts) {
          setContraAccounts(result.accounts);
          setDestinationAccounts(result.allAccounts || result.accounts);
        }
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
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
  } = useForm<DepositVoucherFormData>({
    resolver: zodResolver(depositVoucherSchema),
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
      ...destinationAccounts.cash,
      ...destinationAccounts.bank,
      ...destinationAccounts.digitalWallet,
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

  const onSubmit = async (data: DepositVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      const fromAcc = getAccountDetails(data.fromAccountId);
      const toAcc = getAccountDetails(data.toAccountId);

      if (!fromAcc || !toAcc) {
        throw new Error("Invalid account selection");
      }

      // Check if depositing amount exceeds source account balance (only check if cash account)
      const isCashSource = contraAccounts.cash.some(a => a.id === data.fromAccountId) || 
                           contraAccounts.digitalWallet.some(a => a.id === data.fromAccountId);
      if (isCashSource && fromAccountBalance !== null && data.amount > fromAccountBalance) {
        throw new Error(`Insufficient funds. Available balance in ${fromAcc.name} is ৳${fromAccountBalance.toFixed(2)}`);
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
        description: data.description || `Cash Deposit: ${fromAcc.name} → ${toAcc.name}`,
        lines,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create deposit voucher");
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

  const renderBalance = (balance: number | null, loading: boolean) => {
    if (loading) {
      return (
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <FiLoader className="h-3 w-3 animate-spin" /> Fetching balance...
        </div>
      );
    }
    if (balance !== null) {
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

  const renderAccountSelect = (
    name: "fromAccountId" | "toAccountId",
    label: string,
    placeholder: string,
    optionsList: AccountGroup,
    excludeAccountId?: string,
    balance?: number | null,
    loadingBalance?: boolean
  ) => {
    const searchQuery = name === "fromAccountId" ? fromSearch : toSearch;
    const setSearchQuery = name === "fromAccountId" ? setFromSearch : setToSearch;

    const filterGroupAccounts = (list: AccountOption[]) => {
      if (!searchQuery) return list.filter((acc) => acc.id !== excludeAccountId);
      const query = searchQuery.toLowerCase();
      return list.filter(
        (acc) =>
          acc.id !== excludeAccountId &&
          (acc.code.toLowerCase().includes(query) ||
            acc.name.toLowerCase().includes(query) ||
            acc.description?.toLowerCase().includes(query))
      );
    };

    const filteredCash = filterGroupAccounts(optionsList.cash);
    const filteredBank = filterGroupAccounts(optionsList.bank);
    const filteredWallet = filterGroupAccounts(optionsList.digitalWallet);
    const totalFilteredCount = filteredCash.length + filteredBank.length + filteredWallet.length;

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
              disabled={loading}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setSearchQuery("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <div className="p-2 border-b sticky top-0 bg-popover z-10">
                  <div className="relative">
                    <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSearchQuery(e.target.value);
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
                <div className="max-h-[220px] overflow-y-auto">
                  {totalFilteredCount === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                      No matching accounts found
                    </div>
                  ) : (
                    <>
                      {filteredCash.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider border-b bg-muted/30 sticky top-0 z-10">
                            CASH ACCOUNTS
                          </div>
                          {filteredCash.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {filteredBank.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider border-b border-t mt-1 bg-muted/30 sticky top-0 z-10">
                            BANK ACCOUNTS
                          </div>
                          {filteredBank.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {filteredWallet.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider border-b border-t mt-1 bg-muted/30 sticky top-0 z-10">
                            DIGITAL WALLETS
                          </div>
                          {filteredWallet.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
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
        {renderBalance(balance ?? null, loadingBalance ?? false)}
        {errors[name] && (
          <p className="text-xs text-destructive mt-1">{errors[name]?.message}</p>
        )}
      </div>
    );
  };

  if (loadingData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <FiLoader className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading accounts data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <Card className="border-border/60 shadow-sm w-full">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <FiTrendingUp className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>Cash Deposit (Contra Voucher)</CardTitle>
            <CardDescription>
              Record a transfer of physical cash, digital wallet balance, or bank funds.
            </CardDescription>
          </div>
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
                {/* Source Selection */}
                {renderAccountSelect(
                  "fromAccountId",
                  "Source Account (Transfer From)",
                  "Select source account...",
                  contraAccounts, // Filtered by own warehouse (for normal users)
                  watchedToAccountId,
                  fromAccountBalance,
                  loadingFromBalance
                )}

                {/* Destination Selection */}
                {renderAccountSelect(
                  "toAccountId",
                  "Destination Account (Deposit To)",
                  "Select destination account...",
                  destinationAccounts, // Unfiltered (shows all warehouses/global accounts)
                  watchedFromAccountId,
                  toAccountBalance,
                  loadingToBalance
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    disabled={loading}
                    {...register("date")}
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive mt-1">{errors.date.message}</p>
                  )}
                </div>

                {/* Reference */}
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference Number</Label>
                  <Input
                    id="reference"
                    placeholder="e.g. DEP-10023"
                    disabled={loading}
                    {...register("reference")}
                  />
                </div>

                {/* Deposit Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Deposit Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="any"
                    placeholder="৳ 0.00"
                    disabled={loading}
                    {...register("amount", { valueAsNumber: true })}
                  />
                  {errors.amount && (
                    <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Remarks / Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this cash deposit transaction..."
                  rows={3}
                  disabled={loading}
                  {...register("description")}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? (
                    <>
                      <FiLoader className="h-4 w-4 animate-spin" />
                      Posting Deposit...
                    </>
                  ) : (
                    <>
                      <FiSave className="h-4 w-4" />
                      Post Deposit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
