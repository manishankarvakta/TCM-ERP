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
import { getClientsForReceipt, getClientFinancialInfo, getReceiptAccountsFromCOA } from "../../_actions/receipt.action";
import { createVoucher, postVoucher } from "../../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";
import { format } from "date-fns";
import { PaymentAccountType } from "@/lib/payment-account-config";

// Form validation schema
const receiptVoucherSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  receiveAccountId: z.string().min(1, "Receive account is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().optional(),
});

type ReceiptVoucherFormData = z.infer<typeof receiptVoucherSchema>;

interface ClientOption {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  clientCode: string | null;
  chartOfAccountId: string | null;
  chartOfAccountName: string | null;
}

interface ReceiptAccountOption {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type?: PaymentAccountType;
}

interface ClientFinancialInfo {
  totalSales: number;
  totalReceipts: number;
  outstandingBalance: number;
  lastSaleDate: Date | null;
  lastReceiptDate: Date | null;
}

export default function ReceiptVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [receiptAccounts, setReceiptAccounts] = useState<{
    cash: ReceiptAccountOption[];
    bank: ReceiptAccountOption[];
    digitalWallet: ReceiptAccountOption[];
  }>({ cash: [], bank: [], digitalWallet: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [financialInfo, setFinancialInfo] = useState<ClientFinancialInfo | null>(null);
  const [loadingFinancialInfo, setLoadingFinancialInfo] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");

  // Filtered clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const query = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(query))
    );
  }, [clients, clientSearch]);

  // Filtered receipt accounts based on search
  const filteredReceiptAccounts = useMemo(() => {
    const filterList = (list: ReceiptAccountOption[]) => {
      if (!accountSearch) return list;
      const query = accountSearch.toLowerCase();
      return list.filter(
        (a) =>
          a.code.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query)
      );
    };

    return {
      cash: filterList(receiptAccounts.cash),
      bank: filterList(receiptAccounts.bank),
      digitalWallet: filterList(receiptAccounts.digitalWallet),
    };
  }, [receiptAccounts, accountSearch]);

  // Fetch clients and receipt accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsResult, receiptAccountsResult] = await Promise.all([
          getClientsForReceipt(),
          getReceiptAccountsFromCOA(),
        ]);

        if (clientsResult.success) {
          setClients(clientsResult.clients);
        }

        if (receiptAccountsResult.success && receiptAccountsResult.accounts) {
          // @ts-ignore - Ignoring strict type check for now to allow data flow
          setReceiptAccounts(receiptAccountsResult.accounts);
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
  } = useForm<ReceiptVoucherFormData>({
    resolver: zodResolver(receiptVoucherSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      clientId: "",
      receiveAccountId: "",
      amount: 0,
      reference: "",
      description: "",
    },
  });

  const watchedClientId = watch("clientId");
  const watchedAmount = watch("amount");

  // Update selected client and fetch financial info when clientId changes
  useEffect(() => {
    const updateClientInfo = async () => {
      if (watchedClientId) {
        const client = clients.find((c) => c.id === watchedClientId);
        setSelectedClient(client || null);

        if (client) {
          setLoadingFinancialInfo(true);
          try {
            const result = await getClientFinancialInfo(client.id);
            if (result.success && result.financialInfo) {
              setFinancialInfo(result.financialInfo);
            } else {
              setFinancialInfo(null);
            }
          } catch (err) {
            console.error("Failed to fetch financial info:", err);
          } finally {
            setLoadingFinancialInfo(false);
          }
        } else {
          setFinancialInfo(null);
        }
      } else {
        setSelectedClient(null);
        setFinancialInfo(null);
      }
    };

    updateClientInfo();
  }, [watchedClientId, clients]);

  const onSubmit = async (data: ReceiptVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      // Get the selected client's AR account
      const client = clients.find((c) => c.id === data.clientId);
      if (!client) {
        throw new Error("Client not found");
      }

      if (!client.chartOfAccountId) {
        throw new Error("Client does not have an AR account. Please update the client first.");
      }

      // Get the receive account (Cash/Bank/Digital Wallet) from all categories
      const allReceiptAccounts = [
        ...receiptAccounts.cash,
        ...receiptAccounts.bank,
        ...receiptAccounts.digitalWallet,
      ];
      const receiveAccount = allReceiptAccounts.find((a) => a.id === data.receiveAccountId);
      if (!receiveAccount) {
        throw new Error("Receive account not found");
      }

      // Build voucher lines (DR Cash/Bank/Digital Wallet, CR AR)
      const lines = [
        {
          lineNumber: 1,
          debitAmount: data.amount,
          creditAmount: 0,
          description: `Receipt from ${client.name || client.email}`,
          chartOfAccountId: receiveAccount.id, // Use ID from COA
        },
        {
          lineNumber: 2,
          debitAmount: 0,
          creditAmount: data.amount,
          description: `Receipt to ${receiveAccount.name}`,
          chartOfAccountId: client.chartOfAccountId,
          clientId: client.id,
        },
      ];

      // Create the voucher
      const createResult = await createVoucher({
        date: data.date,
        type: VoucherType.RECEIPT,
        reference: data.reference || undefined,
        description: data.description || `Receipt from ${client.name || client.email}`,
        clientId: client.id,
        lines,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create receipt voucher");
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
        <CardTitle>Create Receipt Voucher</CardTitle>
        <CardDescription>
          Record a receipt from a client. This will debit your Cash/Bank/Digital Wallet account and credit the client&apos;s AR account.
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
            <div className="grid grid-cols-2 gap-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => {
                        if (!open) setClientSearch("");
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                          <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                            <Input
                              placeholder="Filter clients..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-8 h-8 text-xs bg-muted/50"
                            />
                          </div>
                        </div>
                        <div className="pt-1">
                          {filteredClients.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                              No clients found
                            </div>
                          ) : (
                            filteredClients.map((client) => (
                              <SelectItem key={client.id} value={client.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                <span className="text-sm font-medium">
                                  {client.name || client.email}
                                  {client.company && ` (${client.company})`}
                                  {client.clientCode && ` - ${client.clientCode}`}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.clientId && (
                  <p className="text-sm text-destructive">{errors.clientId.message}</p>
                )}
                {selectedClient && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedClient.chartOfAccountId ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <FiCheck className="h-3 w-3" />
                        AR Account: {selectedClient.chartOfAccountName}
                      </span>
                    ) : (
                      <span className="text-destructive">
                        Warning: This client does not have an AR account
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Receive Account Selection */}
              <div className="space-y-2">
                <Label htmlFor="receiveAccountId">Receive Account *</Label>
                <Controller
                  name="receiveAccountId"
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select receive account" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                          <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                            <Input
                              placeholder="Filter receive accounts..."
                              value={accountSearch}
                              onChange={(e) => setAccountSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-8 h-8 text-xs bg-muted/50"
                            />
                          </div>
                        </div>
                        <div className="pt-1">
                          {filteredReceiptAccounts.cash.length === 0 &&
                           filteredReceiptAccounts.bank.length === 0 &&
                           filteredReceiptAccounts.digitalWallet.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                              No receive accounts found
                            </div>
                          ) : (
                            <>
                              {filteredReceiptAccounts.cash.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                                    CASH ACCOUNTS
                                  </div>
                                  {filteredReceiptAccounts.cash.map((account) => (
                                    <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                      <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {filteredReceiptAccounts.bank.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider mt-1">
                                    BANK ACCOUNTS
                                  </div>
                                  {filteredReceiptAccounts.bank.map((account) => (
                                    <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                      <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {filteredReceiptAccounts.digitalWallet.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 uppercase tracking-wider mt-1">
                                    DIGITAL WALLETS
                                  </div>
                                  {filteredReceiptAccounts.digitalWallet.map((account) => (
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
                {errors.receiveAccountId && (
                  <p className="text-sm text-destructive">{errors.receiveAccountId.message}</p>
                )}
              </div>
            </div>

            {/* Client Financial Information */}
            {selectedClient && selectedClient.chartOfAccountId && (
              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FiDollarSign className="h-4 w-4" />
                  Client Financial Summary
                </h4>
                {loadingFinancialInfo ? (
                  <div className="flex items-center justify-center py-4">
                    <FiLoader className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading financial data...</span>
                  </div>
                ) : financialInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Sales */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FiTrendingUp className="h-3 w-3" />
                        Total Sales
                      </div>
                      <p className="text-lg font-semibold font-mono">৳{financialInfo.totalSales.toFixed(2)}</p>
                      {financialInfo.lastSaleDate && (
                        <p className="text-[10px] text-muted-foreground">
                          Last: {format(new Date(financialInfo.lastSaleDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {/* Total Receipts */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FiTrendingDown className="h-3 w-3" />
                        Total Receipts
                      </div>
                      <p className="text-lg font-semibold font-mono text-green-600">৳{financialInfo.totalReceipts.toFixed(2)}</p>
                      {financialInfo.lastReceiptDate && (
                        <p className="text-[10px] text-muted-foreground">
                          Last: {format(new Date(financialInfo.lastReceiptDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {/* Outstanding Balance */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FiDollarSign className="h-3 w-3" />
                        Outstanding Balance
                      </div>
                      <p className={`text-lg font-semibold font-mono ${financialInfo.outstandingBalance > 0 ? "text-red-600" : "text-gray-600"}`} >
                        ৳{financialInfo.outstandingBalance.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {financialInfo.outstandingBalance > 0 ? "Receivable" : "Cleared"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No financial data available</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label htmlFor="date">Receipt Date *</Label>
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
                  placeholder="e.g., Invoice number, Receipt number"
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
            {selectedClient?.chartOfAccountId && watchedAmount > 0 && (() => {
              const allReceiptAccounts = [
                ...receiptAccounts.cash,
                ...receiptAccounts.bank,
                ...receiptAccounts.digitalWallet,
              ];
              const selectedAccount = allReceiptAccounts.find(a => a.id === watch("receiveAccountId"));

              return (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">Accounting Preview</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>DR: {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "Select Account"}</span>
                      <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CR: {selectedClient.chartOfAccountName}</span>
                      <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })() }

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !selectedClient?.chartOfAccountId}
              >
                {loading ? (
                  <>
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                    Creating & Posting...
                  </>
                ) : (
                  "Create & Post Receipt"
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
