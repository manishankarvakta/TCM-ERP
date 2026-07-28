"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  FiCopy,
  FiZap 
} from "react-icons/fi";
import { getAccountsForJournal } from "../../_actions/journal.action";
import { createVoucher, postVoucher } from "../../../../vouchers/_actions/voucher.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

// Voucher line schema
const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  debitAmount: z.number().min(0, "Amount must be >= 0").default(0),
  creditAmount: z.number().min(0, "Amount must be >= 0").default(0),
  description: z.string().optional(),
}).refine(
  (data) => {
    const hasDebit = data.debitAmount > 0;
    const hasCredit = data.creditAmount > 0;
    return (hasDebit && !hasCredit) || (!hasDebit && hasCredit);
  },
  {
    message: "Line must be Debit OR Credit",
    path: ["debitAmount"],
  }
);

// Journal voucher schema with balance validation
const journalVoucherSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().min(1, "Description is required for journal entries"),
  lines: z.array(voucherLineSchema).min(2, "At least 2 lines are required"),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    return Math.abs(totalDebit - totalCredit) <= 0.01;
  },
  {
    message: "Total debits must equal total credits",
    path: ["lines"],
  }
);

type JournalVoucherFormData = z.infer<typeof journalVoucherSchema>;

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function JournalVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");
  
  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getAccountsForJournal();
        if (result.success) {
          setAccounts(result.accounts);
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
  }, []);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const searchLower = accountSearch.toLowerCase();
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, accountSearch]);

  // Group accounts by type for better display
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, AccountOption[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    filteredAccounts.forEach((acc) => {
      if (groups[acc.type]) {
        groups[acc.type].push(acc);
      }
    });
    return groups;
  }, [filteredAccounts]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<JournalVoucherFormData>({
    resolver: zodResolver(journalVoucherSchema as any),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      reference: "",
      description: "",
      lines: [
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");

  // Calculate totals
  const totalDebit = watchedLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = watchedLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) <= 0.01;

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

  const cloneLine = (index: number) => {
    const lineToClone = watchedLines[index];
    insert(index + 1, { ...lineToClone });
  };

  const autoBalance = () => {
    if (isBalanced) return;

    if (difference > 0) {
      // Debits > Credits, add Credit line
      append({
        chartOfAccountId: "",
        debitAmount: 0,
        creditAmount: difference,
        description: "Balancing entry",
      });
    } else {
      // Credits > Debits, add Debit line
      append({
        chartOfAccountId: "",
        debitAmount: Math.abs(difference),
        creditAmount: 0,
        description: "Balancing entry",
      });
    }
  };

  const handleLineKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // If valid number entered
      if (index === fields.length - 1) {
        addLine();
      }
    }
  };

  const onSubmit = async (data: JournalVoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      const lines = data.lines.map((line, index) => ({
        lineNumber: index + 1,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        description: line.description || undefined,
        chartOfAccountId: line.chartOfAccountId,
      }));

      // Create the voucher
      const createResult = await createVoucher({
        date: data.date,
        type: VoucherType.JOURNAL,
        reference: data.reference || undefined,
        description: data.description,
        lines,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create journal voucher");
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
                Journal Voucher
                <Badge variant="outline" className="font-normal">General Entry</Badge>
              </CardTitle>
              <CardDescription>
                Create general journal entries for adjustments, corrections, and non-cash transactions.
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
                    <p className="font-medium text-xs uppercase tracking-wide">Restriction</p>
                    <p className="text-xs mt-1">
                      No entries to Control Accounts (AR/AP/Inventory) or Cash/Bank. Use specialized vouchers instead.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs uppercase tracking-wide">Usage Pro-tip</p>
                    <p className="text-xs mt-1">
                      Press <b>Enter</b> on the last amount field to add a new line. Use <b>Auto-Balance</b> to fix differences.
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

              {/* Header Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder="e.g., ADJ-2024-001"
                    {...register("reference")}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Monthly depreciation for Office Equipment"
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
                        <TableHead className="w-[15%] text-right">Debit</TableHead>
                        <TableHead className="w-[15%] text-right">Credit</TableHead>
                        <TableHead className="w-[20%]">Note</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const lineError = errors.lines?.[index];
                        const selectedAccountId = watchedLines[index]?.chartOfAccountId;
                        const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

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
                                      onOpenChange={(open) => {
                                        if (!open) setAccountSearch("");
                                      }}
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
                                              placeholder="Filter accounts..."
                                              value={accountSearch}
                                              onChange={(e) => setAccountSearch(e.target.value)}
                                              onKeyDown={(e) => e.stopPropagation()}
                                              className="pl-8 h-8 text-xs bg-muted/50"
                                            />
                                          </div>
                                        </div>
                                        <div className="pt-1">
                                        {Object.entries(groupedAccounts).map(([type, accs]) => {
                                          if (accs.length === 0) return null;
                                          return (
                                            <div key={type}>
                                              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground bg-muted/30 uppercase tracking-wider">
                                                {type}
                                              </div>
                                              {accs.map((account) => (
                                                <SelectItem
                                                  key={account.id}
                                                  value={account.id}
                                                  className="text-left cursor-pointer py-2 focus:bg-accent"
                                                >
                                                  <span className="text-sm font-medium">{account.code} - {account.name}</span>
                                                </SelectItem>
                                              ))}
                                            </div>
                                          );
                                        })}
                                        </div>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {selectedAccount && (
                                  <div className="flex items-center gap-2 px-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      selectedAccount.type === 'ASSET' || selectedAccount.type === 'EXPENSE' ? 'bg-blue-500' : 'bg-green-500'
                                    }`} />
                                    <span className="text-[10px] text-muted-foreground font-medium">{selectedAccount.code}</span>
                                  </div>
                                )}
                              </div>
                              {lineError?.chartOfAccountId && (
                                <p className="text-[10px] text-destructive mt-1 font-medium bg-destructive/5 inline-block px-1 rounded">
                                  {lineError.chartOfAccountId.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.debitAmount`}
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
                                        if (value > 0) setValue(`lines.${index}.creditAmount`, 0);
                                      }}
                                      onFocus={(e) => e.target.select()}
                                      disabled={loading}
                                    />
                                  </div>
                                )}
                              />
                               {lineError?.debitAmount && (
                                <p className="text-[10px] text-destructive text-right mt-1">Check line</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.creditAmount`}
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
                                        if (value > 0) setValue(`lines.${index}.debitAmount`, 0);
                                      }}
                                      onKeyDown={(e) => handleLineKeyDown(e, index)}
                                      onFocus={(e) => e.target.select()}
                                      disabled={loading}
                                    />
                                  </div>
                                )}
                              />
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
                                  disabled={loading || fields.length <= 2}
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
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Total Debit</p>
                    <p className="font-mono font-bold text-lg">৳{totalDebit.toFixed(2)}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Total Credit</p>
                    <p className="font-mono font-bold text-lg">৳{totalCredit.toFixed(2)}</p>
                  </div>
                  <div className="pl-6 border-l">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Difference</p>
                     <div className="flex items-center gap-2">
                        <p className={`font-mono font-bold text-lg ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                          ৳{Math.abs(difference).toFixed(2)}
                        </p>
                        {!isBalanced && (
                          <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            onClick={autoBalance}
                            className="h-6 text-[10px] gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200"
                            title="Add balancing line"
                          >
                            <FiZap className="w-3 h-3" /> Auto-Balance
                          </Button>
                        )}
                     </div>
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
                    disabled={loading || !isBalanced || fields.length < 2 || totalDebit === 0}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Create Journal Voucher"
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
