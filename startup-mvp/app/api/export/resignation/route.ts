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

    const canView = await hasPermission(session.user.id, "hr.resignation", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status") || "ALL";

    const where: any = {};

    if (search) {
      where.employee = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    if (statusParam === "TRASH") {
      where.isTrash = true;
    } else {
      where.isTrash = false;
      if (statusParam !== "ALL") {
        where.status = statusParam;
      }
    }

    const resignations = await prisma.resignation.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeCode: true, designation: true } },
        manager: { select: { name: true } },
        admin: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedData = resignations.map((r) => ({
      "Employee Code": r.employee?.employeeCode || "",
      "Employee Name": r.employee?.name || "",
      "Designation": r.employee?.designation || "-",
      "Resign Date": r.resignDate ? new Date(r.resignDate).toISOString().split("T")[0] : "-",
      "Effective Date": r.effectiveDate ? new Date(r.effectiveDate).toISOString().split("T")[0] : "-",
      "Reason": r.reason || "-",
      "Status": r.status || "",
      "Manager Approved By": r.manager?.name || "-",
      "Admin Approved By": r.admin?.name || "-",
      "Submitted At": r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "-",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resignations");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="resignation-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="resignation-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Resignation export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export resignation applications" }, { status: 500 });
  }
}
