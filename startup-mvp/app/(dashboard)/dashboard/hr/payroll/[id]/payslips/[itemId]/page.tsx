import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import PayslipClient from "./_components/payslip-client";
import { serializeDecimalAndDate } from "@/lib/utils/serialization";

interface PayslipPageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function PayslipPage({ params }: PayslipPageProps) {
  const { id, itemId } = await params;
  const session = await auth();
  if (!session?.user) {
    return <div>Unauthorized</div>;
  }

  const canView = await hasPermission(session.user.id, "hr.payroll", "view");
  if (!canView) {
    return <div>Permission Denied</div>;
  }

  const payrollItem = await prisma.payrollItem.findUnique({
    where: { id: itemId, payrollId: id },
    include: {
      payroll: {
        select: {
          payrollNumber: true,
          month: true,
          year: true,
          status: true,
          voucherId: true,
          paymentVchId: true,
          createdAt: true
        }
      },
      employee: {
        include: {
          employeeType: true
        }
      }
    }
  });

  if (!payrollItem) {
    return notFound();
  }

  // Get attendance summary for the month
  const startDate = new Date((payrollItem as any).payroll.year, (payrollItem as any).payroll.month - 1, 1);
  const endDate = new Date((payrollItem as any).payroll.year, (payrollItem as any).payroll.month, 0);
  
  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: payrollItem.employeeId,
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const attendanceSummary = {
    present: attendances.filter(a => a.status === "PRESENT").length,
    absent: attendances.filter(a => a.status === "ABSENT").length,
    late: attendances.filter(a => a.status === "LATE").length,
    leave: attendances.filter(a => a.status === "LEAVE").length,
    totalWorkingDays: attendances.length,
    totalOtHours: attendances.reduce((acc, curr) => acc + Number(curr.otHours || 0), 0)
  };

  const orgInfo = await prisma.organization.findFirst({
    where: { status: "active" }
  });

  return (
    <PageGuard permissionKey="hr.payroll" requiredOperation="view">
      <PayslipClient 
        payrollItem={serializeDecimalAndDate(payrollItem)}
        attendanceSummary={serializeDecimalAndDate(attendanceSummary)}
        orgInfo={serializeDecimalAndDate(orgInfo)}
      />
    </PageGuard>
  );
}
