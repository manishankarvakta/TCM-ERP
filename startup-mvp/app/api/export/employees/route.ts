import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const exportFormat = searchParams.get("format") || "csv";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status !== "all" && status !== "trash") {
      where.status = status;
    } else if (status === "trash") {
      where.status = "trash";
    } else {
      where.status = { not: "trash" };
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Employee Code",
      "Full Name",
      "Designation",
      "Department",
      "Email",
      "Phone",
      "Gender",
      "Status",
      "Salary (BDT)",
      "Joining Date",
      "National ID",
    ];

    const rows = employees.map((emp) => [
      `"${emp.employeeCode || ""}"`,
      `"${emp.name || ""}"`,
      `"${emp.designation || ""}"`,
      `"${emp.department || ""}"`,
      `"${emp.email || ""}"`,
      `"${emp.phone || ""}"`,
      `"${emp.gender || ""}"`,
      `"${emp.status || "active"}"`,
      `"${emp.salary ? Number(emp.salary) : 0}"`,
      `"${emp.joiningDate ? format(new Date(emp.joiningDate), "yyyy-MM-dd") : ""}"`,
      `"${emp.nationalId || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const filename = `Employees_Export_${format(new Date(), "yyyyMMdd_HHmm")}.${exportFormat === "excel" ? "csv" : "csv"}`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
