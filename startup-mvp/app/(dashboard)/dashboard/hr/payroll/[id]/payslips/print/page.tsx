import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import PrintAllClient from "./_components/print-all-client";
import { serializeDecimalAndDate } from "@/lib/utils/serialization";

interface PrintAllPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintAllPage({ params }: PrintAllPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return <div>Unauthorized</div>;
  }

  const canView = await hasPermission(session.user.id, "hr.payroll", "view");
  if (!canView) {
    return <div>Permission Denied</div>;
  }

  // Fetch default active SalaryStructurePolicy
  const defaultPolicy = await prisma.salaryStructurePolicy.findFirst({
    where: { isDefault: true, status: "active", isTrash: false }
  });

  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          employee: {
            include: {
              employeeType: {
                include: {
                  salaryStructurePolicy: true
                }
              }
            }
          }
        },
        orderBy: { employee: { name: "asc" } }
      }
    }
  });

  if (!payroll) {
    return notFound();
  }

  const { calculateSalaryBreakdown } = await import("@/lib/hr-payroll/policy-calculation");

  const resolvedItems = payroll.items.map(item => {
    const basic = Number(item.basic);
    const houseRent = Number(item.houseRent);
    const medical = Number(item.medical);
    const transport = Number(item.transport);
    const foodAllowance = Number(item.foodAllowance);

    const isFlat = houseRent === 0 && medical === 0 && transport === 0 && foodAllowance === 0;

    let resBasic = basic;
    let resHouseRent = houseRent;
    let resMedical = medical;
    let resTransport = transport;
    let resFoodAllowance = foodAllowance;

    if (isFlat) {
      const gross = basic; // since others are 0, item.basic represents the gross base salary
      const resolvedPolicy = item.employee?.employeeType?.salaryStructurePolicy || defaultPolicy || null;

      const breakdown = calculateSalaryBreakdown({
        grossSalary: gross,
        salaryStructurePolicy: resolvedPolicy
      });

      resBasic = breakdown.basicSalary;
      resHouseRent = breakdown.houseRent;
      resMedical = breakdown.medical;
      resTransport = breakdown.transport;
      resFoodAllowance = breakdown.food;
    }

    return {
      ...item,
      basic: resBasic,
      houseRent: resHouseRent,
      medical: resMedical,
      transport: resTransport,
      foodAllowance: resFoodAllowance,
      otAmount: Number(item.otAmount),
      bonus: Number(item.bonus),
      grossPay: Number(item.grossPay),
      absentDeduction: Number(item.absentDeduction),
      loanDeduction: Number(item.loanDeduction),
      taxDeduction: Number(item.taxDeduction),
      pfDeduction: Number(item.pfDeduction),
      totalDeduction: Number(item.totalDeduction),
      netPay: Number(item.netPay),
      tiffinAllowance: Number(item.tiffinAllowance),
      nightAllowance: Number(item.nightAllowance),
      holidayAllowance: Number(item.holidayAllowance),
      otherAllowance: Number(item.otherAllowance),
      lateDeduction: Number(item.lateDeduction),
      otherDeduction: Number(item.otherDeduction),
    };
  });

  const orgInfo = await prisma.organization.findFirst({
    where: { status: "active" }
  });

  const serializedPayroll = {
    ...serializeDecimalAndDate(payroll),
    items: serializeDecimalAndDate(resolvedItems)
  };

  return (
    <PageGuard permissionKey="hr.payroll" requiredOperation="view">
      <PrintAllClient 
        payroll={serializedPayroll}
        orgInfo={serializeDecimalAndDate(orgInfo)}
      />
    </PageGuard>
  );
}
