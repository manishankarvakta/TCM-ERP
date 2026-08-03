import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { arrayToCSV } from "@/lib/utils/export-csv";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "peoples.employees", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status") || "all";
    const employeeTypeId = searchParams.get("employeeTypeId");
    const gender = searchParams.get("gender");
    const departmentId = searchParams.get("departmentId");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (statusParam && statusParam !== "all" && statusParam !== "all-status") {
      where.status = statusParam;
    } else {
      where.status = { not: "trash" };
    }

    if (employeeTypeId && employeeTypeId !== "all") {
      where.employeeTypeId = employeeTypeId;
    }

    if (gender && gender !== "all") {
      where.gender = gender;
    }

    if (departmentId && departmentId !== "all") {
      where.departmentId = departmentId;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        employeeType: true,
        departmentRelation: true,
        deviceMappings: true,
      },
    });

    const formattedData = employees.map((emp) => ({
      "Employee Code": emp.employeeCode || "",
      "Name": emp.name || "",
      "Email": emp.email || "-",
      "Phone": emp.phone || "-",
      "Designation": emp.designation || "-",
      "Department": emp.departmentRelation?.name || emp.department || "-",
      "Employee Type": emp.employeeType?.name || "-",
      "Gender": emp.gender || "-",
      "Gross Salary": Number(emp.salary || 0),
      "Status": emp.status || "",
      "Joining Date": emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : "-",
      "Biometric PIN": Array.from(new Set(emp.deviceMappings?.map((m) => m.deviceUserId).filter(Boolean))).join("; ") || "-",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="employees-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="employees-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Employees export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export employees" }, { status: 500 });
  }
}
