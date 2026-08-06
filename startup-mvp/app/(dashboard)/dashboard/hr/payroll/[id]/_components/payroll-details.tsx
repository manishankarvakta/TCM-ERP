"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiCheck, FiFileText, FiSend, FiDownload, FiPrinter, FiTrash2, FiRotateCcw, FiRefreshCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { updatePayrollStatus, postPayroll, disbursePayroll, voidPayroll, deletePayroll, recalculatePayroll } from "@/app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action";
import { format } from "date-fns";

interface PayrollDetailsClientProps {
  payroll: any;
  expenseAccounts: { id: string; code: string; name: string }[];
  cashBankAccounts: { id: string; code: string; name: string }[];
  permissions: {
    canEdit: boolean;
    canApprove: boolean;
    canPost: boolean;
    canDelete: boolean;
    canVoid: boolean;
  };
}

export default function PayrollDetailsClient({
  payroll,
  expenseAccounts,
  cashBankAccounts,
  permissions,
}: PayrollDetailsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedExpenseAccount, setSelectedExpenseAccount] = useState<string>("");
  const [selectedCashBankAccount, setSelectedCashBankAccount] = useState<string>("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);

  const formatCurrency = (amount: any) => {
    return `৳${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  const handleApprove = () => {
    startTransition(async () => {
      const result = await updatePayrollStatus(payroll.id, "APPROVED");
      if (result.success) {
        toast({ title: "Success", description: "Payroll approved successfully" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to approve", variant: "destructive" });
      }
    });
  };

  const handleRecalculate = () => {
    startTransition(async () => {
      const result = await recalculatePayroll(payroll.id);
      if (result.success) {
        toast({ title: "Success", description: "Payroll recalculated successfully!" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to recalculate payroll", variant: "destructive" });
      }
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deletePayroll(payroll.id);
      if (result.success) {
        toast({ title: "Success", description: "Payroll deleted successfully" });
        router.push("/dashboard/hr/payroll");
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete", variant: "destructive" });
      }
    });
  };

  const confirmResetToDraft = () => {
    startTransition(async () => {
      const result = await updatePayrollStatus(payroll.id, "DRAFT");
      if (result.success) {
        toast({ title: "Success", description: "Payroll reverted to Draft successfully" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to reset status", variant: "destructive" });
      }
    });
  };

  const confirmVoid = () => {
    startTransition(async () => {
      const result = await voidPayroll(payroll.id);
      if (result.success) {
        toast({ title: "Success", description: "Payroll successfully voided and reverted to Draft." });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to void payroll", variant: "destructive" });
      }
    });
  };

  const handlePost = () => {
    if (!selectedExpenseAccount) {
      toast({ title: "Error", description: "Please select a salary expense account", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const result = await postPayroll(payroll.id, selectedExpenseAccount);
      if (result.success) {
        setPostModalOpen(false);
        toast({ title: "Success", description: "Payroll posted to accounting successfully!" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to post", variant: "destructive" });
      }
    });
  };

  const handleDisburse = () => {
    if (!selectedCashBankAccount) {
      toast({ title: "Error", description: "Please select a Cash/Bank account", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const result = await disbursePayroll(payroll.id, selectedCashBankAccount);
      if (result.success) {
        setDisburseModalOpen(false);
        toast({ title: "Success", description: "Payroll disbursed successfully!" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to disburse", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Draft</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "POSTED":
        return payroll.paymentVchId 
          ? <Badge className="bg-purple-500 hover:bg-purple-600">Disbursed (Paid)</Badge>
          : <Badge className="bg-emerald-500 hover:bg-emerald-600">Posted (Accrued)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            {payroll.payrollNumber}
            {getStatusBadge(payroll.status)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Salary for {getMonthName(payroll.month)} {payroll.year} • Generated by {payroll.creator?.name} on {format(new Date(payroll.createdAt), "PPP")}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/dashboard/hr/payroll/${payroll.id}/export`} download>
              <FiDownload className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>

          <Button variant="outline" asChild>
            <Link href={`/dashboard/hr/payroll/${payroll.id}/payslips/print`}>
              <FiPrinter className="mr-2 h-4 w-4" />
              Print all Payslip
            </Link>
          </Button>

          {payroll.status === "DRAFT" && (
            <>
              {permissions.canEdit && (
                <Button variant="outline" onClick={handleRecalculate} disabled={isPending}>
                  <FiRefreshCw className="mr-2 h-4 w-4" />
                  Recalculate Payroll
                </Button>
              )}
              {permissions.canApprove && (
                <Button onClick={handleApprove} disabled={isPending}>
                  <FiCheck className="mr-2 h-4 w-4" />
                  Approve Payroll
                </Button>
              )}
              {permissions.canDelete && (
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={isPending}>
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Delete Draft
                </Button>
              )}
            </>
          )}
          
          {payroll.status === "APPROVED" && permissions.canPost && (
            <>
              <Button onClick={() => setPostModalOpen(true)} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <FiSend className="mr-2 h-4 w-4" />
                Post to Accounting
              </Button>
              <Button variant="outline" onClick={() => setResetConfirmOpen(true)} disabled={isPending}>
                <FiRotateCcw className="mr-2 h-4 w-4" />
                Reset to Draft
              </Button>
            </>
          )}

          {payroll.status === "POSTED" && !payroll.paymentVchId && (
            <>
              {permissions.canPost && (
                <Button onClick={() => setDisburseModalOpen(true)} disabled={isPending} className="bg-purple-600 hover:bg-purple-700">
                  <FiSend className="mr-2 h-4 w-4" />
                  Disburse Salary
                </Button>
              )}
              {permissions.canVoid && (
                <Button variant="destructive" onClick={() => setVoidConfirmOpen(true)} disabled={isPending}>
                  <FiRotateCcw className="mr-2 h-4 w-4" />
                  Void & Revert
                </Button>
              )}
            </>
          )}

          {payroll.status === "POSTED" && payroll.voucherId && (
            <Button variant="outline" asChild>
              <a href={`/dashboard/accounts/vouchers/${payroll.voucherId}`}>
                <FiFileText className="mr-2 h-4 w-4" />
                Accrual Voucher
              </a>
            </Button>
          )}

          {payroll.status === "POSTED" && payroll.paymentVchId && (
            <Button variant="outline" asChild>
              <a href={`/dashboard/accounts/vouchers/${payroll.paymentVchId}`}>
                <FiFileText className="mr-2 h-4 w-4" />
                Payment Voucher
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payroll.items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(payroll.items.reduce((sum: number, item: any) => sum + Number(item.grossPay), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(payroll.items.reduce((sum: number, item: any) => sum + Number(item.totalDeduction), 0))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Net Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(payroll.totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary Breakdown</CardTitle>
          <CardDescription>Detailed view of earnings and deductions per employee.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[2200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] min-w-[180px] max-w-[180px] sticky left-0 bg-background z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee</TableHead>
                  <TableHead className="text-right">Basic (55%)</TableHead>
                  <TableHead className="text-right">House Rent (26%)</TableHead>
                  <TableHead className="text-right">Medical (5%)</TableHead>
                  <TableHead className="text-right">Transport (4%)</TableHead>
                  <TableHead className="text-right">Food (10%)</TableHead>
                  <TableHead className="text-right">Base Gross</TableHead>
                  <TableHead className="text-right">OT Pay</TableHead>
                  <TableHead className="text-right">Tiffin</TableHead>
                  <TableHead className="text-right">Night</TableHead>
                  <TableHead className="text-right">Holiday</TableHead>
                  <TableHead className="text-right">Bonus/Oth</TableHead>
                  <TableHead className="text-right">Custom Bonus</TableHead>
                  <TableHead className="text-right font-semibold text-primary bg-primary/5">Total Earnings</TableHead>
                  <TableHead className="text-right">Absent Ded.</TableHead>
                  <TableHead className="text-right">Late Ded.</TableHead>
                  <TableHead className="text-right">Loan Ded.</TableHead>
                  <TableHead className="text-right">Tax/PF</TableHead>
                  <TableHead className="text-right">Custom Fine</TableHead>
                  <TableHead className="w-[120px] min-w-[120px] max-w-[120px] text-right font-semibold text-destructive sticky right-[180px] bg-background z-20 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Ded.</TableHead>
                  <TableHead className="w-[100px] min-w-[100px] max-w-[100px] text-right font-bold text-primary sticky right-[80px] bg-background z-20">Net Pay</TableHead>
                  <TableHead className="w-[80px] min-w-[80px] max-w-[80px] sticky right-0 bg-background z-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.items.map((item: any) => {
                  const baseGrossSalary =
                    Number(item.basic || 0) +
                    Number(item.houseRent || 0) +
                    Number(item.medical || 0) +
                    Number(item.transport || 0) +
                    Number(item.foodAllowance || 0);

                  const bonusAndOth = Number(item.bonus || 0) + Number(item.otherAllowance || 0);
                  const taxAndPf = Number(item.taxDeduction || 0) + Number(item.pfDeduction || 0);

                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell className="w-[180px] min-w-[180px] max-w-[180px] sticky left-0 bg-background group-hover:bg-muted z-10 transition-colors border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="font-medium">{item.employee.name}</div>
                        <div className="text-xs text-muted-foreground">{item.employee.employeeCode || "N/A"} • {item.employee.designation || "No Desig."}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.basic)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.houseRent)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.medical)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.transport)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.foodAllowance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(baseGrossSalary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.otAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.tiffinAllowance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.nightAllowance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.holidayAllowance)}</TableCell>
                      <TableCell className="text-right">
                        <div>{formatCurrency(bonusAndOth)}</div>
                        {Number(item.otherAllowance) > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">Att. Bonus</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(item.customBonus)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary bg-primary/5">{formatCurrency(item.grossPay)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.absentDeduction)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.lateDeduction)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.loanDeduction)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(taxAndPf)}</TableCell>
                      <TableCell className="text-right font-medium text-rose-600">{formatCurrency(item.customFine)}</TableCell>
                      <TableCell className="w-[120px] min-w-[120px] max-w-[120px] text-right font-semibold text-destructive sticky right-[180px] bg-background group-hover:bg-muted z-10 transition-colors border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div>{formatCurrency(item.totalDeduction)}</div>
                        {Number(item.otherDeduction) > 0 && (
                          <div className="text-[10px] text-destructive mt-0.5">Oth: {formatCurrency(item.otherDeduction)}</div>
                        )}
                      </TableCell>
                      <TableCell className="w-[100px] min-w-[100px] max-w-[100px] text-right font-bold text-primary sticky right-[80px] bg-background group-hover:bg-muted z-10 transition-colors">
                        {formatCurrency(item.netPay)}
                      </TableCell>
                      <TableCell className="w-[80px] min-w-[80px] max-w-[80px] sticky right-0 bg-background group-hover:bg-muted z-10 transition-colors text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8">
                          <a href={`/dashboard/hr/payroll/${payroll.id}/payslips/${item.id}`} target="_blank" rel="noreferrer">
                            Payslip
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={postModalOpen} onOpenChange={setPostModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Payroll to Accounting</DialogTitle>
            <DialogDescription>
              This will lock the payroll and generate a Journal Entry. The system will automatically credit each employee's Salary Payable account and Advance Account (for loans).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Salary Expense Account *</Label>
              <SearchableSelect
                value={selectedExpenseAccount}
                onValueChange={(val) => setSelectedExpenseAccount(val || "")}
                disabled={isPending}
                placeholder="Select account to debit"
                options={expenseAccounts.map(acc => ({
                  value: acc.id,
                  label: acc.name,
                  description: acc.code || undefined
                }))}
              />
              <p className="text-xs text-muted-foreground">
                This account will be debited for the total salary expense.
              </p>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <div className="flex justify-between font-medium mb-1">
                <span>Total Debit:</span>
                <span>{formatCurrency(payroll.items.reduce((sum: number, item: any) => sum + Number(item.netPay) + Number(item.loanDeduction), 0))}</span>
              </div>
              <p className="text-xs text-muted-foreground">The debit exactly matches the sum of all net payments and loan deductions credited.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPostModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handlePost} disabled={isPending || !selectedExpenseAccount} className="bg-emerald-600 hover:bg-emerald-700">
              {isPending ? "Posting..." : "Confirm & Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disburseModalOpen} onOpenChange={setDisburseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disburse Salary</DialogTitle>
            <DialogDescription>
              This will generate a Payment Voucher. The system will debit each employee's Salary Payable account and credit the selected Cash/Bank account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Cash/Bank Account *</Label>
              <SearchableSelect
                value={selectedCashBankAccount}
                onValueChange={(val) => setSelectedCashBankAccount(val || "")}
                disabled={isPending}
                placeholder="Select account to credit"
                options={cashBankAccounts.map(acc => ({
                  value: acc.id,
                  label: acc.name,
                  description: acc.code || undefined
                }))}
              />
              <p className="text-xs text-muted-foreground">
                This account will be credited to fund the payroll disbursement.
              </p>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <div className="flex justify-between font-medium mb-1">
                <span>Total Payment:</span>
                <span className="text-destructive">{formatCurrency(payroll.items.reduce((sum: number, item: any) => sum + Number(item.netPay), 0))}</span>
              </div>
              <p className="text-xs text-muted-foreground">This is the total net cash that will leave your selected bank account.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleDisburse} disabled={isPending || !selectedCashBankAccount} className="bg-purple-600 hover:bg-purple-700">
              {isPending ? "Processing..." : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Draft Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this draft payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the Draft Payroll {payroll.payrollNumber} and all its aggregated item records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to Draft Confirmation */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Payroll to Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the status of Approved Payroll {payroll.payrollNumber} back to Draft, allowing you to re-generate or modify it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetToDraft}
              disabled={isPending}
            >
              {isPending ? "Resetting..." : "Reset to Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void & Revert Confirmation */}
      <AlertDialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">WARNING: Void posted payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This will void the posted accrual general ledger voucher, unlock all attendance records for this period, and revert the payroll back to Draft status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmVoid}
              disabled={isPending}
            >
              {isPending ? "Voiding..." : "Void & Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
