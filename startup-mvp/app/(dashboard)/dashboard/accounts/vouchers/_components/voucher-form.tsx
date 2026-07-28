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
import { FiAlertCircle, FiPlus, FiTrash2, FiX, FiSearch } from "react-icons/fi";
import { createVoucher } from "../_actions/voucher.action";
import { getChartOfAccounts } from "../../chart-of-accounts/_actions/chart-of-accounts.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  debitAmount: z.number().min(0, "Debit amount must be >= 0").default(0),
  creditAmount: z.number().min(0, "Credit amount must be >= 0").default(0),
  description: z.string().optional(),
}).refine(
  (data) => {
    const hasDebit = data.debitAmount > 0;
    const hasCredit = data.creditAmount > 0;
    return (hasDebit && !hasCredit) || (!hasDebit && hasCredit);
  },
  {
    message: "Each line must have either debit OR credit (not both, not neither)",
    path: ["debitAmount"],
  }
);

const voucherFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.nativeEnum(VoucherType, {
    error: "Voucher type is required",
  }),
  reference: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  lines: z.array(voucherLineSchema).min(2, "At least 2 lines are required"),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    return difference <= 0.01; // Allow small floating point differences
  },
  {
    message: "Double-entry balance mismatch: Total debits must equal total credits",
    path: ["lines"],
  }
);

type VoucherFormData = z.infer<typeof voucherFormSchema>;

interface VoucherFormProps {
  mode: "create";
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function VoucherForm({ mode }: VoucherFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");

  // Fetch active accounts for selection
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getChartOfAccounts(1, 1000, "", "active");
        if (result.success) {
          setAccounts(
            result.accounts.map((a) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherFormSchema as any),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      type: VoucherType.JOURNAL,
      reference: "",
      description: "",
      lines: [
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");
  const watchedType = watch("type");

  // Filter accounts based on search term
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const searchLower = accountSearch.toLowerCase();
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, accountSearch]);

  // Calculate totals
  const totalDebit = watchedLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = watchedLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference <= 0.01;

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

  const onSubmit = async (data: VoucherFormData) => {
    try {
      setLoading(true);
      setError("");

      // Prepare lines with line numbers
      const lines = data.lines.map((line, index) => ({
        lineNumber: index + 1,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        description: line.description || undefined,
        chartOfAccountId: line.chartOfAccountId,
      }));

      const result = await createVoucher({
        date: data.date,
        type: data.type,
        reference: data.reference || undefined,
        description: data.description || undefined,
        lines,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create voucher");
      }

      const basePath = getBasePathFromPathname(pathname);
      router.push(`${basePath}/vouchers`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const voucherTypeOptions = [
    { value: VoucherType.PAYMENT, label: "Payment" },
    { value: VoucherType.RECEIPT, label: "Receipt" },
    { value: VoucherType.JOURNAL, label: "Journal" },
    { value: VoucherType.CONTRA, label: "Contra" },
    { value: VoucherType.SALES, label: "Sales" },
    { value: VoucherType.PURCHASE, label: "Purchase" },
  ];

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Voucher</CardTitle>
          <CardDescription>
            Enter voucher details and add accounting entries. Ensure debits equal credits (double-entry).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Basic Voucher Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
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
                  <Label htmlFor="type">Voucher Type *</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value as VoucherType)}
                        disabled={loading}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select voucher type" />
                        </SelectTrigger>
                        <SelectContent>
                          {voucherTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  type="text"
                  placeholder="e.g., Invoice #12345"
                  {...register("reference")}
                  disabled={loading}
                />
                {errors.reference && (
                  <p className="text-sm text-destructive">{errors.reference.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Voucher description..."
                  {...register("description")}
                  disabled={loading}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Voucher Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Voucher Lines *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLine}
                    disabled={loading || loadingAccounts}
                  >
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>

                {errors.lines && typeof errors.lines.message === "string" && (
                  <p className="text-sm text-destructive">{errors.lines.message}</p>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="w-32">Debit</TableHead>
                        <TableHead className="w-32">Credit</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const lineError = errors.lines?.[index];
                        return (
                          <TableRow key={field.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.chartOfAccountId`}
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={loading || loadingAccounts}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      <div className="p-2">
                                        <div className="relative">
                                          <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                                          <Input
                                            placeholder="Search accounts..."
                                            value={accountSearch}
                                            onChange={(e) => {
                                              setAccountSearch(e.target.value);
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
                                      <div className="max-h-[200px] overflow-y-auto">
                                        {filteredAccounts.map((account) => (
                                          <SelectItem key={account.id} value={account.id} className="text-left">
                                            {account.code} - {account.name}
                                          </SelectItem>
                                        ))}
                                      </div>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {lineError?.chartOfAccountId && (
                                <p className="text-xs text-destructive mt-1">
                                  {lineError.chartOfAccountId.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.debitAmount`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="0.00"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      field.onChange(value);
                                      // Clear credit when debit is entered
                                      if (value > 0) {
                                        setValue(`lines.${index}.creditAmount` as any, 0);
                                      }
                                    }}
                                    disabled={loading}
                                  />
                                )}
                              />
                              {lineError?.debitAmount && (
                                <p className="text-xs text-destructive mt-1">
                                  {lineError.debitAmount.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.creditAmount`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="0.00"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      field.onChange(value);
                                      // Clear debit when credit is entered
                                      if (value > 0) {
                                        setValue(`lines.${index}.debitAmount` as any, 0);
                                      }
                                    }}
                                    disabled={loading}
                                  />
                                )}
                              />
                              {lineError?.creditAmount && (
                                <p className="text-xs text-destructive mt-1">
                                  {lineError.creditAmount.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.description`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="text"
                                    placeholder="Line description"
                                    {...field}
                                    disabled={loading}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              {fields.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLine(index)}
                                  disabled={loading}
                                >
                                  <FiTrash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end gap-6 pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Debit</p>
                    <p className="text-lg font-semibold">{totalDebit.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Credit</p>
                    <p className="text-lg font-semibold">{totalCredit.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Difference</p>
                    <p className={`text-lg font-semibold ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                      {difference.toFixed(2)}
                    </p>
                  </div>
                </div>

                {!isBalanced && (
                  <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Double-entry balance mismatch: Debits ({totalDebit.toFixed(2)}) must equal Credits ({totalCredit.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading || !isBalanced || fields.length < 2}>
                  {loading ? "Creating..." : "Create Voucher"}
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
    </div>
  );
}

