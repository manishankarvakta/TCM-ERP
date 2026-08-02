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

    const canView = await hasPermission(session.user.id, "hr.bonuses", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status") || "ALL";
    const tab = searchParams.get("tab") || "all";

    const where: any = {};

    if (tab === "trash") {
      where.isTrash = true;
    } else {
      where.isTrash = false;
      if (statusParam !== "ALL") {
        where.status = statusParam;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { bonusCode: { contains: search, mode: "insensitive" } },
        {
          employee: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { employeeCode: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const bonuses = await prisma.employeeBonus.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeCode: true, designation: true, department: true } },
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedData = bonuses.map((b) => ({
      "Bonus Code": b.bonusCode || "",
      "Employee Code": b.employee?.employeeCode || "",
      "Employee Name": b.employee?.name || "",
      "Designation": b.employee?.designation || "-",
      "Department": b.employee?.department || "-",
      "Title": b.title || "-",
      "Amount": Number(b.amount || 0),
      "Status": b.status || "",
      "Approved By": b.approver?.name || "-",
      "Effective Date": b.effectiveDate ? new Date(b.effectiveDate).toISOString().split("T")[0] : "-",
      "Created At": b.createdAt ? new Date(b.createdAt).toISOString().split("T")[0] : "-",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bonuses & Rewards");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="bonuses-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bonuses-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Bonuses export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export bonuses" }, { status: 500 });
  }
}
