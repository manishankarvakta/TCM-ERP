import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { calculateSalaryBreakdown } from "@/lib/hr-payroll/policy-calculation";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow more time for large exports

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "hr.payroll", "view");
    if (!canView) {
      return new NextResponse("Permission denied", { status: 403 });
    }

    const payrollId = params.id;
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        paymentVoucher: {
          select: {
            voucherNumber: true,
            date: true,
            postedAt: true,
            VoucherLine: {
              include: { ChartOfAccount: true }
            }
          }
        }
      }
    });

    if (!payroll) {
      return new NextResponse("Payroll not found", { status: 404 });
    }

    // Load default active SalaryStructurePolicy
    const defaultPolicy = await prisma.salaryStructurePolicy.findFirst({
      where: { isDefault: true, status: "active", isTrash: false }
    });

    // CSV Headers
    const headers = [
      "Employee Code",
      "Employee Name",
      "Employee Phone",
      "Department",
      "Designation",
      "Basic Salary",
      "House Rent",
      "Medical",
      "Transport",
      "Food Allowance",
      "Base Gross Salary",
      "OT Pay",
      "Tiffin Allowance",
      "Night Allowance",
      "Holiday Allowance",
      "Festival Bonus",
      "Other Allowance / Attendance Bonus",
      "Custom Bonus",
      "Total Earnings",
      "Absent Deduction",
      "Late Deduction",
      "Loan Deduction",
      "Tax Deduction",
      "PF Deduction",
      "Other Deduction",
      "Custom Fine",
      "Total Deductions",
      "Net Payable",
      "Payment Status",
      "Payroll Status",
      "Payment Voucher",
      "Paid Date",
      "Payment Account"
    ];

    const escapeCsv = (str: string | null | undefined | number) => {
      if (str === null || str === undefined) return '""';
      const escaped = String(str).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const encoder = new TextEncoder();
    
    // Attempt to extract cash/bank account from payment voucher lines (the credited account)
    let paymentAccountName: string | null = null;
    if (payroll.paymentVoucher?.VoucherLine) {
      const creditLine = payroll.paymentVoucher.VoucherLine.find(l => Number(l.creditAmount) > 0);
      if (creditLine) {
        paymentAccountName = creditLine.ChartOfAccount?.name || null;
      }
    }
    
    // Create a ReadableStream that fetches items in chunks
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Push headers first
          controller.enqueue(encoder.encode(headers.join(",") + "\n"));

          const CHUNK_SIZE = 500;
          let cursorId: string | undefined = undefined;
          let hasMore = true;

          let items: any[] = [];
          
          while (hasMore) {
            items = await prisma.payrollItem.findMany({
              where: { payrollId },
              take: CHUNK_SIZE,
              skip: cursorId ? 1 : 0,
              ...(cursorId ? { cursor: { id: cursorId } } : {}),
              include: {
                employee: {
                  select: {
                    employeeCode: true,
                    name: true,
                    phone: true,
                    department: true,
                    designation: true,
                    employeeType: {
                      select: {
                        id: true,
                        name: true,
                        salaryStructurePolicy: {
                          select: {
                            id: true,
                            name: true,
                            basicPercent: true,
                            houseRentPercent: true,
                            medicalPercent: true,
                            transportPercent: true,
                            foodPercent: true,
                          }
                        }
                      }
                    }
                  }
                }
              },
              orderBy: { id: 'asc' }
            });

            if (items.length === 0) {
              hasMore = false;
              break;
            }

            const rowsStr = items.map((item: any) => {
              const basic = Number(item.basic || 0);
              const houseRent = Number(item.houseRent || 0);
              const medical = Number(item.medical || 0);
              const transport = Number(item.transport || 0);
              const foodAllowance = Number(item.foodAllowance || 0);

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

              const baseGrossSalary = resBasic + resHouseRent + resMedical + resTransport + resFoodAllowance;

              return [
                escapeCsv(item.employee.employeeCode),
                escapeCsv(item.employee.name),
                escapeCsv(item.employee.phone),
                escapeCsv(item.employee.department),
                escapeCsv(item.employee.designation),
                escapeCsv(resBasic.toString()),
                escapeCsv(resHouseRent.toString()),
                escapeCsv(resMedical.toString()),
                escapeCsv(resTransport.toString()),
                escapeCsv(resFoodAllowance.toString()),
                escapeCsv(baseGrossSalary.toString()),
                escapeCsv(item.otAmount?.toString()),
                escapeCsv(item.tiffinAllowance?.toString()),
                escapeCsv(item.nightAllowance?.toString()),
                escapeCsv(item.holidayAllowance?.toString()),
                escapeCsv(item.bonus?.toString()),
                escapeCsv(item.otherAllowance?.toString()),
                escapeCsv(item.customBonus?.toString()),
                escapeCsv(item.grossPay?.toString()),
                escapeCsv(item.absentDeduction?.toString()),
                escapeCsv(item.lateDeduction?.toString()),
                escapeCsv(item.loanDeduction?.toString()),
                escapeCsv(item.taxDeduction?.toString()),
                escapeCsv(item.pfDeduction?.toString()),
                escapeCsv(item.otherDeduction?.toString()),
                escapeCsv(item.customFine?.toString()),
                escapeCsv(item.totalDeduction?.toString()),
                escapeCsv(item.netPay?.toString()),
                escapeCsv(item.status),
                escapeCsv(payroll.status),
                escapeCsv(payroll.paymentVoucher?.voucherNumber),
                escapeCsv(payroll.paymentVoucher?.date ? format(new Date(payroll.paymentVoucher.date), "yyyy-MM-dd") : null),
                escapeCsv(paymentAccountName)
              ].join(",");
            }).join("\n") + "\n";

            controller.enqueue(encoder.encode(rowsStr));
            
            if (items.length < CHUNK_SIZE) {
              hasMore = false;
            } else {
              cursorId = items[items.length - 1].id;
            }
          }
        } catch (err) {
          console.error("Stream generation error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    const monthStr = payroll.month.toString().padStart(2, '0');
    const filename = `payroll-${payroll.year}-${monthStr}.csv`;

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("Payroll Export Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
