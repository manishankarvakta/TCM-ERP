"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FiEye, FiSettings, FiTrash2, FiRotateCcw } from "react-icons/fi";
import { format } from "date-fns";
import { PayrollStatus } from "@prisma/client";
import { deletePayroll, restorePayroll, deletePayrollPermanently } from "../_actions/payroll.action";
import { useToast } from "@/hooks/use-toast";
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

interface Payroll {
  id: string;
  payrollNumber: string;
  month: number;
  year: number;
  status: PayrollStatus;
  totalAmount: any;
  createdAt: Date;
  creator: { name: string };
  _count: { items: number };
  totals?: {
    baseGrossSalary: number;
    grossPay: number;
    totalDeduction: number;
    netPay: number;
    otAmount: number;
    tiffinAllowance: number;
    nightAllowance: number;
    holidayAllowance: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PayrollListClientProps {
  initialPayrolls: Payroll[];
  initialPagination: Pagination;
  permissions?: {
    view: boolean;
    edit: boolean;
    delete?: boolean;
    deletePermanently?: boolean;
  };
}

export default function PayrollListClient({
  initialPayrolls = [],
  initialPagination,
  permissions,
}: PayrollListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false);
  const [targetPayroll, setTargetPayroll] = useState<{ id: string; payrollNumber: string } | null>(null);

  const currentStatus = searchParams.get("status") || "ALL";
  const isTrashTab = currentStatus === "TRASH";

  const triggerDelete = (id: string, payrollNumber: string) => {
    setTargetPayroll({ id, payrollNumber });
    setDeleteConfirmOpen(true);
  };

  const triggerRestore = (id: string, payrollNumber: string) => {
    setTargetPayroll({ id, payrollNumber });
    setRestoreConfirmOpen(true);
  };

  const triggerPermanentDelete = (id: string, payrollNumber: string) => {
    setTargetPayroll({ id, payrollNumber });
    setPermanentDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!targetPayroll) return;
    startTransition(async () => {
      const res = await deletePayroll(targetPayroll.id);
      if (res.success) {
        toast({ title: "Success", description: `Payroll ${targetPayroll.payrollNumber} moved to trash successfully` });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to delete payroll", variant: "destructive" });
      }
    });
  };

  const confirmRestore = () => {
    if (!targetPayroll) return;
    startTransition(async () => {
      const res = await restorePayroll(targetPayroll.id);
      if (res.success) {
        toast({ title: "Success", description: `Payroll ${targetPayroll.payrollNumber.split("-deleted-")[0]} restored successfully` });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to restore payroll", variant: "destructive" });
      }
    });
  };

  const confirmPermanentDelete = () => {
    if (!targetPayroll) return;
    startTransition(async () => {
      const res = await deletePayrollPermanently(targetPayroll.id);
      if (res.success) {
        toast({ title: "Success", description: `Payroll ${targetPayroll.payrollNumber} permanently deleted` });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to permanently delete payroll", variant: "destructive" });
      }
    });
  };

  const formatCurrency = (amount: any) => {
    return `৳${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: PayrollStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Draft</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Approved</Badge>;
      case "POSTED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Posted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  // Aggregate totals
  const aggregate = initialPayrolls.reduce(
    (acc, pr) => {
      acc.totalEmployees += pr._count.items;
      acc.totalBaseGross += pr.totals?.baseGrossSalary || 0;
      acc.totalEarnings += pr.totals?.grossPay || 0;
      acc.totalDeductions += pr.totals?.totalDeduction || 0;
      acc.totalNetPayable += Number(pr.totalAmount) || 0;
      acc.totalOT += pr.totals?.otAmount || 0;
      acc.totalAllowances +=
        (pr.totals?.tiffinAllowance || 0) +
        (pr.totals?.nightAllowance || 0) +
        (pr.totals?.holidayAllowance || 0);
      return acc;
    },
    {
      totalEmployees: 0,
      totalBaseGross: 0,
      totalEarnings: 0,
      totalDeductions: 0,
      totalNetPayable: 0,
      totalOT: 0,
      totalAllowances: 0,
    }
  );

  return (
    <div className="space-y-6">
      {initialPayrolls.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Base Gross</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCurrency(aggregate.totalBaseGross)}</div>
              <p className="text-[10px] text-muted-foreground mt-1">For {aggregate.totalEmployees} employees total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-600">{formatCurrency(aggregate.totalEarnings)}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Incl. allowances & OT</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">{formatCurrency(aggregate.totalDeductions)}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Incl. absent, late & loans</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">Total Net Payable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary">{formatCurrency(aggregate.totalNetPayable)}</div>
              <p className="text-[10px] text-primary/80 mt-1">
                OT: {formatCurrency(aggregate.totalOT)} • Alw: {formatCurrency(aggregate.totalAllowances)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payroll ID</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead className="text-right">Total Net Pay</TableHead>
              <TableHead>Generated By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPayrolls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No payroll records found.
                </TableCell>
              </TableRow>
            ) : (
              initialPayrolls.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell>
                    <span className="font-medium text-primary">{pr.payrollNumber}</span>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(pr.createdAt), "MMM d, yyyy h:mm a")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{getMonthName(pr.month)} {pr.year}</div>
                  </TableCell>
                  <TableCell>
                    {pr._count.items} Employees
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ৳{Number(pr.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {pr.creator.name}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(pr.status)}
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    {isTrashTab ? (
                      <>
                        {permissions?.delete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerRestore(pr.id, pr.payrollNumber)}
                            disabled={isPending}
                            title="Restore Payroll"
                          >
                            <FiRotateCcw className="mr-2 h-4 w-4" /> Restore
                          </Button>
                        )}
                        {permissions?.deletePermanently && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => triggerPermanentDelete(pr.id, pr.payrollNumber)}
                            disabled={isPending}
                            title="Delete Permanently"
                          >
                            <FiTrash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/hr/payroll/${pr.id}`}>
                            {pr.status === "DRAFT" || pr.status === "APPROVED" ? (
                              <><FiSettings className="mr-2 h-4 w-4" /> Manage</>
                            ) : (
                              <><FiEye className="mr-2 h-4 w-4" /> View</>
                            )}
                          </Link>
                        </Button>
                        {pr.status === "DRAFT" && permissions?.delete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => triggerDelete(pr.id, pr.payrollNumber)}
                            disabled={isPending}
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} records
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`/dashboard/hr/payroll?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === initialPagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page + 1));
                router.push(`/dashboard/hr/payroll?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Draft Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this draft payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the Draft Payroll {targetPayroll?.payrollNumber} and all its aggregated item records. This action cannot be undone.
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

      {/* Restore Confirmation */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the Payroll {targetPayroll?.payrollNumber?.split("-deleted-")[0]} from Trash back to Draft status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              disabled={isPending}
            >
              {isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Permanently Confirmation */}
      <AlertDialog open={permanentDeleteConfirmOpen} onOpenChange={setPermanentDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete Payroll {targetPayroll?.payrollNumber}? This action is irreversible and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmPermanentDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
