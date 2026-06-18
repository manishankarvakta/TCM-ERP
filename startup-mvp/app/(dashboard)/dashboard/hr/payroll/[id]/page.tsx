import React from "react";
import { getPayrollById } from "@/app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action";
import { prisma } from "@/lib/prisma";
import PayrollDetailsClient from "./_components/payroll-details";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { serializeDecimalAndDate } from "@/lib/utils/serialization";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

interface PayrollDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PayrollDetailsPage({ params }: PayrollDetailsPageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const [result, canEdit, canApprove, canPost] = await Promise.all([
    getPayrollById(id),
    userId ? hasPermission(userId, "hr.payroll", "edit") : false,
    userId ? hasPermission(userId, "hr.payroll", "approve") : false,
    userId ? hasPermission(userId, "hr.payroll", "post" as any) : false, // or accounts.vouchers create
  ]);

  // Fallback for posting if user has voucher creation permission instead of explicit hr.payroll post
  let finalCanPost = canPost;
  if (!finalCanPost && userId) {
    finalCanPost = await hasPermission(userId, "accounts.vouchers", "create");
  }

  if (!result.success || !result.payroll) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/hr/payroll" className="flex items-center text-sm text-muted-foreground hover:text-primary">
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Payrolls
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Payroll not found"}</p>
        </div>
      </div>
    );
  }

  // Fetch expense accounts for the accrual posting modal
  const expenseAccounts = await prisma.chartOfAccount.findMany({
    where: {
      type: "EXPENSE",
      status: "active",
      isControl: false,
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" }
  });

  // Fetch cash/bank accounts for the disbursement modal
  const cashBankAccounts = await prisma.chartOfAccount.findMany({
    where: {
      status: "active",
      CashBankAccount: { isNot: null },
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" }
  });

  return (
    <PageGuard permissionKey="hr.payroll" requiredOperation="view">
      <div className="space-y-6">
        <Link href="/dashboard/hr/payroll" className="flex items-center text-sm text-muted-foreground hover:text-primary w-fit">
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Payrolls
        </Link>
        
        <PayrollDetailsClient 
          payroll={serializeDecimalAndDate(result.payroll)}
          expenseAccounts={expenseAccounts}
          cashBankAccounts={cashBankAccounts}
          permissions={{
            canEdit,
            canApprove,
            canPost: finalCanPost
          }}
        />
      </div>
    </PageGuard>
  );
}
