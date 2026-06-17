"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateLoanStatus } from "../../_actions/loan.action";
import { format } from "date-fns";
import { LoanStatus } from "@prisma/client";
import { 
  FiUser, 
  FiCalendar, 
  FiDollarSign, 
  FiClock, 
  FiFileText, 
  FiCheckCircle, 
  FiXCircle,
  FiBriefcase,
  FiInfo
} from "react-icons/fi";

interface LoanDetailsClientProps {
  loan: any;
  permissions?: {
    approve: boolean;
  };
}

export default function LoanDetailsClient({ loan, permissions }: LoanDetailsClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusUpdate = async (status: LoanStatus) => {
    startTransition(async () => {
      const result = await updateLoanStatus(loan.id, status);
      if (result.success) {
        toast({ title: "Success", description: `Loan application ${status.toLowerCase()} successfully` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update status", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: LoanStatus) => {
    switch (status) {
      case "APPROVED": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>;
      case "PENDING": return <Badge className="bg-amber-500 hover:bg-amber-600">Pending Approval</Badge>;
      case "REJECTED": return <Badge variant="destructive">Rejected</Badge>;
      case "CLOSED": return <Badge variant="outline">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FiDollarSign className="text-primary" />
                  Loan Application Details
                </CardTitle>
                <CardDescription>Application ID: {loan.id}</CardDescription>
              </div>
              {getStatusBadge(loan.status)}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FiInfo className="h-4 w-4" />
                  Financial Summary
                </h3>
                <div className="grid gap-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Loan Amount</span>
                    <span className="font-bold text-lg">${Number(loan.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Monthly Installment</span>
                    <span className="font-semibold text-primary">${Number(loan.monthlyInstallment).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Tenure</span>
                    <span>{loan.tenureMonths} Months</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Remaining Balance</span>
                    <span className="font-semibold">${Number(loan.remainingBalance).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Issue Date</span>
                    <span>{format(new Date(loan.issueDate), "PPP")}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FiFileText className="h-4 w-4" />
                  Purpose
                </h3>
                <div className="p-4 bg-muted/30 rounded-lg border italic min-h-[120px]">
                  {loan.purpose || "No purpose provided for this loan application."}
                </div>
              </div>
            </div>

            {loan.status === "PENDING" && permissions?.approve && (
              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-end gap-3">
                <Button 
                  variant="outline" 
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleStatusUpdate("REJECTED")}
                  disabled={isPending}
                >
                  <FiXCircle className="mr-2 h-4 w-4" />
                  Reject Application
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                  onClick={() => handleStatusUpdate("APPROVED")}
                  disabled={isPending}
                >
                  <FiCheckCircle className="mr-2 h-4 w-4" />
                  Approve Loan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <CardTitle className="text-md flex items-center gap-2">
              <FiUser className="h-4 w-4 text-primary" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-lg">{loan.employee.name}</span>
              <span className="text-xs text-muted-foreground bg-primary/5 px-2 py-1 rounded w-fit uppercase font-semibold tracking-wider">
                {loan.employee.employeeCode}
              </span>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <FiBriefcase className="h-4 w-4 text-muted-foreground" />
                <span>{loan.employee.designation || "Not specified"}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiInfo className="h-4 w-4 text-muted-foreground" />
                <span>{loan.employee.department || "Not specified"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <CardTitle className="text-md flex items-center gap-2">
              <FiClock className="h-4 w-4 text-primary" />
              Application Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted At</span>
              <span>{format(new Date(loan.createdAt), "MMM d, h:mm a")}</span>
            </div>
            {loan.status !== "PENDING" && (
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Action By</span>
                <span>{loan.approver?.name || "System"}</span>
              </div>
            )}
            {loan.voucher && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Voucher</span>
                <Badge variant="secondary">{loan.voucher.voucherNumber}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
