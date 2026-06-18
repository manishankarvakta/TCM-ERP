"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";
import { LoanStatus } from "@prisma/client";

/**
 * Get all loans
 */
export async function getLoans() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const loans = await prisma.employeeLoan.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, loans };
  } catch (error) {
    console.error("Error fetching loans:", error);
    return { success: false, error: "Failed to fetch loans" };
  }
}

/**
 * Get loan by ID with details
 */
export async function getLoanById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const loan = await prisma.employeeLoan.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            department: true,
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
          }
        },
        voucher: {
          select: {
            id: true,
            voucherNumber: true,
          }
        }
      }
    });

    if (!loan) return { success: false, error: "Loan not found" };

    return { success: true, loan };
  } catch (error) {
    console.error("Error fetching loan details:", error);
    return { success: false, error: "Failed to fetch loan details" };
  }
}

/**
 * Create a new loan application
 */
export async function createLoan(data: {
  employeeId: string;
  amount: number;
  interestRate?: number;
  tenureMonths: number;
  monthlyInstallment: number;
  purpose?: string;
  startDate: Date;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canCreate = await hasPermission(session.user.id, "hr.loans", "create");
    if (!canCreate) return { success: false, error: "Permission denied" };

    const { startDate, ...rest } = data;

    const loan = await prisma.employeeLoan.create({
      data: {
        ...rest,
        issueDate: startDate,
        remainingBalance: data.amount,
        status: "PENDING",
        createdBy: session.user.id,
      }
    });

    await logItemCreated(session.user.id, "EMPLOYEE_LOAN", loan.id, `Created loan for employee ${data.employeeId}`);
    revalidateBothPaths("/dashboard/hr/loans");

    return { success: true, loan };
  } catch (error) {
    console.error("Error creating loan:", error);
    return { success: false, error: "Failed to create loan" };
  }
}

/**
 * Update loan status (Approve/Reject)
 */
export async function updateLoanStatus(loanId: string, status: LoanStatus) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canApprove = await hasPermission(session.user.id, "hr.loans", "approve");
    if (!canApprove) return { success: false, error: "Permission denied" };

    const updateData: any = { status };
    if (status === "APPROVED" || status === "REJECTED") {
      updateData.approvedBy = session.user.id;
    }

    const loan = await prisma.employeeLoan.update({
      where: { id: loanId },
      data: updateData
    });

    await logItemUpdated(session.user.id, "EMPLOYEE_LOAN", loan.id, [`Updated loan status to ${status}`]);
    revalidateBothPaths("/dashboard/hr/loans");

    return { success: true, loan };
  } catch (error) {
    console.error("Error updating loan status:", error);
    return { success: false, error: "Failed to update loan status" };
  }
}
