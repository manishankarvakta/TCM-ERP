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
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch, FiDollarSign } from "react-icons/fi";
import { VoucherAccountingPreview } from "../../_components/voucher-accounting-preview";
import { createVoucher } from "../../_actions/voucher.action";
import { getChartOfAccounts } from "../../../chart-of-accounts/_actions/chart-of-accounts.action";
import { getClients } from "../../../../clients/_actions/client.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { VoucherType } from "@prisma/client";

const voucherLineSchema = z.object({
  chartOfAccountId: z.string().min(1, "Account is required"),
  debitAmount: z.number().optional().default(0),
  creditAmount: z.number().optional().default(0),
  description: z.string().optional(),
  clientId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

const voucherFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  lines: z.array(voucherLineSchema).min(2, "At least 2 lines are required"),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    return difference <= 0.01;
  },
  {
    message: "Double-entry balance mismatch: Debits must equal Credits",
    path: ["lines"],
  }
);

type VoucherFormData = z.infer<typeof voucherFormSchema>;

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function ReceiptVoucherForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");
  
  // UI Context State
  const [receiptContext, setReceiptContext] = useState<"INVOICE" | "ADVANCE" | "OTHER">("OTHER");

  // Dynamic Labels based on Context
  const contextLabels = useMemo(() => {
    switch (receiptContext) {
      case "INVOICE":
        return {
          title: "Against Invoice",
          desc: "Record payment received from a customer for specific outstanding invoices.",
          actorLabel: "Customer Name / ID",
          detailsLabel: "Receipt Details",
          detailsPlaceholder: "e.g., Payment for Invoice #789, Multiple Invoices",
          impact: "Cash ↑ → Accounts Receivable",
          helper: "Revenue is not recorded through receipt vouchers.",
        };
      case "ADVANCE":
        return {
          title: "Advance from Customer",
          desc: "Record advance payment received from a customer before invoicing.",
          actorLabel: "Customer Name / ID",
          detailsLabel: "Advance Details",
          detailsPlaceholder: "e.g., Advance for Order #101, Project Deposit",
          impact: "Cash ↑ → Customer Advance",
          helper: "Advance receipts are recorded as liabilities.",
        };
      default:
         return {
          title: "Other Receipt",
          desc: "Record miscellaneous receipts, refund or other income.",
          actorLabel: "Payer / Source",
          detailsLabel: "Description",
          detailsPlaceholder: "What is this receipt for?",
          impact: "Cash/Bank ↑ → Receivable / Income",
          helper: "General receipt of funds into the business.",
        };
    }
  }, [receiptContext]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch,
  } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherFormSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      reference: "",
      description: "",
      lines: [
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
        { chartOfAccountId: "", debitAmount: 0, creditAmount: 0, description: "" },
      ],
      clientId: null,
      supplierId: null,
      userId: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLines = watch("lines");
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [accountsRes, clientsRes] = await Promise.all([
          getChartOfAccounts(1, 1000, "", "active"),
          getClients(1, 100)
        ]);
        
        if (accountsRes.success && accountsRes.accounts) {
          setAccounts(accountsRes.accounts.map(a => ({
            id: a.id,
            code: a.code,
            name: a.name,
            type: a.type
          })));
        }

        if (clientsRes.success && clientsRes.clients) {
          setClients(clientsRes.clients.map((c: any) => ({ id: c.id, name: c.name || c.email })));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const searchLower = accountSearch.toLowerCase();
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, accountSearch]);

  const totalDebit = watchedLines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = watchedLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference <= 0.01;

  const onSubmit = async (data: VoucherFormData) => {
    try {
      setLoading(true);
      setError("");
      
      const lines = data.lines.map((line, index) => ({
        lineNumber: index + 1,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        description: line.description || undefined,
        chartOfAccountId: line.chartOfAccountId,
        clientId: line.clientId ?? undefined,
        supplierId: line.supplierId ?? undefined,
        userId: line.userId ?? undefined,
      }));

      const finalDescription = data.description 
        ? `[${contextLabels.title}] ${data.description}` 
        : `[${contextLabels.title}]`;

      const result = await createVoucher({
        date: data.date,
        type: VoucherType.RECEIPT,
        reference: data.reference,
        description: finalDescription,
        clientId: data.clientId ?? undefined,
        supplierId: data.supplierId ?? undefined,
        userId: data.userId ?? undefined,
        lines,
      });

      if (!result.success) throw new Error(result.error);
      
      const basePath = getBasePathFromPathname(pathname);
      router.push(`${basePath}/accounts/vouchers`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating receipt voucher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
         {/* SECTION 1: Receipt Context */}
        <Card className="border-t-4 border-t-green-600">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                       <div className="bg-green-100 p-2 rounded-lg text-green-600">
                          <FiDollarSign className="w-5 h-5" />
                       </div>
                       <div>
                          <CardTitle>{contextLabels.title}</CardTitle>
                          <CardDescription>{contextLabels.desc}</CardDescription>
                       </div>
                  </div>
                  
                  <div className="w-full md:w-[250px]">
                      <Select 
                        value={receiptContext} 
                        onValueChange={(val: any) => setReceiptContext(val)}
                      >
                        <SelectTrigger className="bg-background">
                           <SelectValue placeholder="Receipt Type" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="INVOICE">Against Invoice</SelectItem>
                           <SelectItem value="ADVANCE">Advance from Customer</SelectItem>
                           <SelectItem value="OTHER">Other Receipt</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                </div>
            </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* SECTION 2: Client & Reference */}
            <Card className="md:col-span-1">
                 <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Client & Reference</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-2">
                      <Label>{contextLabels.actorLabel}</Label>
                      {receiptContext !== "OTHER" ? (
                        <Controller
                          name="clientId"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Customer" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      ) : (
                        <Input 
                          placeholder={contextLabels.actorLabel} 
                          value={watch("description")?.split("] ").pop() || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Preserve the context prefix if it exists
                            const currentDescription = watch("description");
                            const prefixMatch = currentDescription?.match(/^\[.*?\]\s*/);
                            const newDescription = prefixMatch ? `${prefixMatch[0]}${val}` : val;
                            setValue("description", newDescription);
                          }}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                        <Label>Reference No.</Label>
                        <Input placeholder="Receipt # / Ref" {...register("reference")} />
                         {errors.reference && <p className="text-xs text-destructive">{errors.reference.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" {...register("date")} />
                     </div>
                 </CardContent>
            </Card>

             {/* SECTION 3: Receipt Details */}
            <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{contextLabels.detailsLabel}</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-2">
                        <Label>Summary / Narration</Label>
                        <Textarea 
                            placeholder={contextLabels.detailsPlaceholder}
                            className="resize-none" 
                            rows={4}
                            {...register("description")} 
                        />
                         {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                    </div>
                 </CardContent>
            </Card>
        </div>

        {/* SECTION 4: Voucher Lines */}
        <Card className="mt-6">
            <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Voucher Lines (Accounting)</CardTitle>
                    <Button type="button" size="sm" variant="outline" onClick={() => append({ chartOfAccountId: "", debitAmount: 0, creditAmount: 0 })}>
                        <FiPlus className="w-4 h-4 mr-2" />
                        Add Line
                    </Button>
                 </div>
            </CardHeader>
            <CardContent>
                 {errors.lines && <div className="text-sm text-destructive mb-2">{errors.lines.message}</div>}
                 
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead>
                                    Account
                                    <p className="text-[10px] font-normal text-muted-foreground">Cash or Bank account will be debited.</p>
                                </TableHead>
                                <TableHead className="w-32 text-right">
                                    Debit
                                    <p className="text-[10px] font-normal text-muted-foreground text-right">Enter amount received.</p>
                                </TableHead>
                                <TableHead className="w-32 text-right">
                                    Credit
                                </TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>
                                         <Controller
                                            name={`lines.${index}.chartOfAccountId`}
                                            control={control}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange} disabled={loadingData}>
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="Select Account" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                         <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                                            <Input 
                                                                placeholder="Search..." 
                                                                className="h-8 text-xs" 
                                                                value={accountSearch}
                                                                onChange={(e) => setAccountSearch(e.target.value)}
                                                                onKeyDown={(e) => e.stopPropagation()}
                                                            />
                                                         </div>
                                                        {filteredAccounts.map(acc => (
                                                            <SelectItem key={acc.id} value={acc.id}>
                                                                {acc.name} <span className="opacity-50 text-xs">({acc.code})</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.lines?.[index]?.chartOfAccountId && (
                                            <p className="text-[10px] text-destructive mt-1">{errors.lines[index]?.chartOfAccountId?.message}</p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" step="0.01" className="h-8 text-right" placeholder="0.00"
                                            {...register(`lines.${index}.debitAmount`, { valueAsNumber: true })}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setValue(`lines.${index}.debitAmount`, val);
                                                if(val > 0) setValue(`lines.${index}.creditAmount`, 0);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" step="0.01" className="h-8 text-right" placeholder="0.00"
                                            {...register(`lines.${index}.creditAmount`, { valueAsNumber: true })}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setValue(`lines.${index}.creditAmount`, val);
                                                if(val > 0) setValue(`lines.${index}.debitAmount`, 0);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                         <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                                            <FiTrash2 className="w-4 h-4" />
                                         </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                
                 {/* Totals & Balance */}
                <div className="grid grid-cols-3 gap-4 mt-4 bg-muted/20 p-4 rounded-lg">
                    <div>
                         <p className="text-xs text-muted-foreground uppercase">Total Debit</p>
                         <p className="font-semibold text-lg">{totalDebit.toFixed(2)}</p>
                    </div>
                     <div>
                         <p className="text-xs text-muted-foreground uppercase">Total Credit</p>
                         <p className="font-semibold text-lg">{totalCredit.toFixed(2)}</p>
                    </div>
                     <div>
                         <p className="text-xs text-muted-foreground uppercase">Difference</p>
                         <p className={`font-semibold text-lg ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                            {difference.toFixed(2)}
                         </p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* SECTION 5: Accounting Impact & Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <VoucherAccountingPreview 
                type={VoucherType.RECEIPT}
                title={contextLabels.title}
                impact={contextLabels.impact}
                helper={contextLabels.helper}
            />

            <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <FiAlertCircle className="w-4 h-4 text-slate-500" />
                        <CardTitle className="text-sm font-medium text-slate-700">Journal Preview</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-slate-600 font-mono bg-white p-3 rounded border border-slate-100">
                        {fields.length === 0 ? (
                            <span className="text-slate-400 italic">No entries yet...</span>
                        ) : (
                            <div className="space-y-1">
                                {watchedLines.map((line, idx) => {
                                    const acc = accounts.find(a => a.id === line.chartOfAccountId);
                                    const accName = acc ? acc.name : "Select Account";
                                    if (line.debitAmount > 0) return <div key={idx}>Dr. {accName} <span className="float-right">{line.debitAmount.toFixed(2)}</span></div>;
                                    if (line.creditAmount > 0) return <div key={idx}>Cr. {accName} <span className="float-right">{line.creditAmount.toFixed(2)}</span></div>;
                                    return null;
                                })}
                                <div className="border-t pt-1 mt-1 font-bold">
                                    <div>Total <span className="float-right">{totalDebit.toFixed(2)}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
                <FiAlertCircle /> {error}
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
             <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
             <Button type="submit" disabled={loading || !isBalanced || totalDebit === 0}>Create Receipt Voucher</Button>
        </div>
      </form>
    </div>
  );
}
