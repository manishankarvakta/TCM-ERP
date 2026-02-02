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
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { VoucherAccountingPreview } from "../../_components/voucher-accounting-preview";
import { createVoucher } from "../../_actions/voucher.action";
import { getCashBankAccounts } from "../../../cash-bank/_actions/cash-bank.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  debitAmount: z.number().optional().default(0),
  creditAmount: z.number().optional().default(0),
  description: z.string().optional(),
});

const contraFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  lines: z.array(voucherLineSchema).length(2, "Exactly 2 lines are required for a transfer"),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference <= 0.01;
    const isSameAccount = data.lines[0].chartOfAccountId === data.lines[1].chartOfAccountId;
    return isBalanced && !isSameAccount;
  },
  {
    message: "Transfer must be balanced and between different accounts",
    path: ["lines"],
  }
);

type ContraFormData = z.infer<typeof contraFormSchema>;

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
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const result = await getCashBankAccounts();
        if (result.success && result.accounts) {
          const options: CashBankAccountOption[] = [
            ...result.accounts.cash.map((cb) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "CASH" as const,
            })),
            ...result.accounts.bank.map((cb) => ({
              id: cb.id,
              chartOfAccountId: cb.chartOfAccount.id,
              code: cb.chartOfAccount.code,
              name: cb.chartOfAccount.name,
              type: "BANK" as const,
            })),
          ];
          setCashBankAccounts(options);
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
    setValue,
    watch,
  } = useForm<ContraFormData>({
    resolver: zodResolver(contraFormSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      reference: "",
      description: "",
      lines: [
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "Transfer Out" },
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "Transfer In" },
      ],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");
  const totalDebit = watchedLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = watchedLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference <= 0.01 && totalDebit > 0;

  const onSubmit = async (data: ContraFormData) => {
    try {
      setLoading(true);
      setError("");

      const result = await createVoucher({
        date: data.date,
        type: VoucherType.CONTRA,
        reference: data.reference,
        description: data.description || "Internal Transfer",
        lines: data.lines.map((l, i) => ({
          ...l,
          lineNumber: i + 1,
        })),
      });

      if (!result.success) throw new Error(result.error);
      
      const basePath = getBasePathFromPathname(pathname);
      router.push(`${basePath}/accounts/vouchers`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating transfer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <FiRefreshCw className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Internal Transfer (Contra)</CardTitle>
                <CardDescription>Move funds between Cash and Bank accounts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 mb-4">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...register("date")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Reference (Optional)</Label>
                <Input placeholder="Check #, Wire ID, etc." {...register("reference")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                placeholder="Why are you moving these funds?" 
                rows={2} 
                {...register("description")} 
              />
            </div>

            {/* TWO LINES TABLE */}
            <div className="border rounded-lg overflow-hidden mt-6">
              <Table>
                <TableHeader className="bg-muted/50 font-bold">
                  <TableRow>
                    <TableHead className="w-[200px]">Type</TableHead>
                    <TableHead>Account (Cash/Bank Only)</TableHead>
                    <TableHead className="w-32 text-right">Debit</TableHead>
                    <TableHead className="w-32 text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id} className="h-16">
                      <TableCell className="font-medium text-slate-600 italic">
                        {index === 0 ? "From Account (Source)" : "To Account (Dest)"}
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.chartOfAccountId`}
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={loadingAccounts}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select Account" />
                              </SelectTrigger>
                              <SelectContent>
                                {cashBankAccounts.map(acc => (
                                  <SelectItem key={acc.chartOfAccountId} value={acc.chartOfAccountId}>
                                    {acc.name} <span className="opacity-50 text-xs text-right ml-2">({acc.code})</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" step="0.01" className="h-9 text-right font-semibold" placeholder="0.00"
                          {...register(`lines.${index}.debitAmount`, { valueAsNumber: true })}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setValue(`lines.${index}.debitAmount`, val);
                            if (val > 0) {
                              setValue(`lines.${index}.creditAmount`, 0);
                              // Auto-fill the other side to keep it simple for users
                              const otherIndex = index === 0 ? 1 : 0;
                              setValue(`lines.${otherIndex}.creditAmount`, val);
                              setValue(`lines.${otherIndex}.debitAmount`, 0);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" step="0.01" className="h-9 text-right font-semibold" placeholder="0.00"
                          {...register(`lines.${index}.creditAmount`, { valueAsNumber: true })}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setValue(`lines.${index}.creditAmount`, val);
                            if (val > 0) {
                              setValue(`lines.${index}.debitAmount`, 0);
                              // Auto-fill the other side
                              const otherIndex = index === 0 ? 1 : 0;
                              setValue(`lines.${otherIndex}.debitAmount`, val);
                              setValue(`lines.${otherIndex}.creditAmount`, 0);
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ACCOUNTING IMPACT SECTION */}
            <VoucherAccountingPreview 
                type={VoucherType.CONTRA}
                title="Internal Transfer"
                impact="Cash ↔ Bank transfer (no income or expense)"
                helper="Use this voucher to transfer money between Cash and Bank accounts only."
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading || !isBalanced} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                {loading ? "Processing..." : "Submit Transfer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
