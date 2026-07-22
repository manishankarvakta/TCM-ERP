"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FiAlertTriangle, FiUser, FiCalendar, FiDollarSign, FiFileText, FiCheckCircle } from "react-icons/fi";
import { FineStatus } from "@prisma/client";

interface FineDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fine: {
    id: string;
    amount: number;
    fineDate: string | Date;
    reason: string;
    status: FineStatus;
    createdAt: string | Date;
    payrollId?: string | null;
    employee: {
      id: string;
      name: string;
      employeeCode: string | null;
      designation: string | null;
      department: string | null;
      photo?: string | null;
    };
    creator?: { name: string | null } | null;
    approver?: { name: string | null } | null;
  } | null;
}

export default function FineDetailsDialog({ open, onOpenChange, fine }: FineDetailsDialogProps) {
  if (!fine) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: FineStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Approved</Badge>;
      case "APPLIED":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">Applied in Payroll</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Cancelled</Badge>;
      case "PENDING":
      default:
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">Pending Approval</Badge>;
    }
  };

  const initials = fine.employee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FiAlertTriangle className="text-destructive h-5 w-5" />
            Fine / Penalty Record Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Employee Info Header */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border">
            <Avatar className="h-14 w-14 border shadow-sm">
              <AvatarImage src={fine.employee.photo || undefined} alt={fine.employee.name} />
              <AvatarFallback className="bg-destructive/10 text-destructive font-semibold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg leading-tight">{fine.employee.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fine.employee.employeeCode || "No Code"} • {fine.employee.designation || "No Designation"}
              </p>
              {fine.employee.department && (
                <p className="text-xs text-muted-foreground">{fine.employee.department}</p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1 p-3 rounded-lg border bg-background">
              <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                <FiDollarSign className="h-3.5 w-3.5" /> Penalty Amount
              </div>
              <p className="font-bold text-lg text-destructive">{formatCurrency(fine.amount)}</p>
            </div>

            <div className="space-y-1 p-3 rounded-lg border bg-background">
              <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                <FiCalendar className="h-3.5 w-3.5" /> Fine Date
              </div>
              <p className="font-semibold text-base">
                {new Date(fine.fineDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="space-y-1 p-3 rounded-lg border bg-background">
              <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                <FiCheckCircle className="h-3.5 w-3.5" /> Current Status
              </div>
              <div className="pt-0.5">{getStatusBadge(fine.status)}</div>
            </div>

            <div className="space-y-1 p-3 rounded-lg border bg-background">
              <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                <FiUser className="h-3.5 w-3.5" /> Issued By
              </div>
              <p className="font-medium">{fine.creator?.name || "System"}</p>
            </div>
          </div>

          {/* Reason Section */}
          <div className="space-y-1.5">
            <div className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider gap-1.5">
              <FiFileText className="h-3.5 w-3.5" /> Reason / Notes
            </div>
            <div className="p-3 rounded-lg border bg-muted/20 text-sm whitespace-pre-wrap leading-relaxed">
              {fine.reason}
            </div>
          </div>

          {/* Approver / Application Meta */}
          <div className="text-xs text-muted-foreground flex flex-col gap-1 pt-2 border-t">
            {fine.approver?.name && (
              <div>Approved by: <span className="font-medium text-foreground">{fine.approver.name}</span></div>
            )}
            <div>Recorded on: {new Date(fine.createdAt).toLocaleString()}</div>
            {fine.status === "APPLIED" && (
              <div className="text-blue-600 font-medium mt-1">
                ✓ Deducted and locked in payroll run.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
