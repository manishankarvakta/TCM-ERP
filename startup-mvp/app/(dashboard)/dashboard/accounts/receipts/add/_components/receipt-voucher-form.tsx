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
import { getClientsForReceipt } from "../../_actions/receipt.action";
import { getCashBankAccounts } from "../../../cash-bank/_actions/cash-bank.action";
import { createVoucher, postVoucher } from "../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

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
  email: string;
  company: string | null;
  clientCode: string | null;
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

export default function ReceiptVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<CashBankAccountOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);

  // Fetch clients and cash/bank accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsResult, cashBankResult] = await Promise.all([
          getClientsForReceipt(),
          getCashBankAccounts(),
        ]);

        if (clientsResult.success) {
          setClients(clientsResult.clients);
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

  // Update selected client when clientId changes
  useEffect(() => {
    if (watchedClientId) {
      const client = clients.find((c) => c.id === watchedClientId);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
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

      // Get the receive account (Cash/Bank)
      const receiveAccount = cashBankAccounts.find((a) => a.chartOfAccountId === data.receiveAccountId);
      if (!receiveAccount) {
        throw new Error("Receive account not found");
      }

      // Build voucher lines (DR Cash/Bank, CR AR)
      const lines = [
        {
          lineNumber: 1,
          debitAmount: data.amount,
          creditAmount: 0,
          description: `Receipt from ${client.name || client.email}`,
          chartOfAccountId: receiveAccount.chartOfAccountId,
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
          Record a receipt from a client. This will debit your Cash/Bank account and credit the client&apos;s AR account.
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
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No clients available
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name || client.email}
                            {client.company && ` (${client.company})`}
                            {client.clientCode && ` - ${client.clientCode}`}
                          </SelectItem>
                        ))
                      )}
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
              <Label htmlFor="receiveAccountId">Receive Account (Cash/Bank) *</Label>
              <Controller
                name="receiveAccountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select receive account" />
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
              {errors.receiveAccountId && (
                <p className="text-sm text-destructive">{errors.receiveAccountId.message}</p>
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
            {selectedClient?.chartOfAccountId && watchedAmount > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Accounting Preview</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>DR: {cashBankAccounts.find(a => a.chartOfAccountId === watch("receiveAccountId"))?.name || "Cash/Bank"}</span>
                    <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CR: {selectedClient.chartOfAccountName}</span>
                    <span className="font-mono">৳{watchedAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
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
