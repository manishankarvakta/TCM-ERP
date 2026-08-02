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

    const canView = await hasPermission(session.user.id, "hr.leave", "view");
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

    const leaveApplications = await prisma.leaveApplication.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeCode: true, designation: true } },
        leaveType: { select: { name: true, isPaid: true } },
        manager: { select: { name: true } },
        hr: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedData = leaveApplications.map((app) => ({
      "Employee Code": app.employee?.employeeCode || "",
      "Employee Name": app.employee?.name || "",
      "Designation": app.employee?.designation || "-",
      "Leave Type": app.leaveType?.name || "-",
      "Is Paid": app.leaveType?.isPaid ? "Yes" : "No",
      "Start Date": app.startDate ? new Date(app.startDate).toISOString().split("T")[0] : "-",
      "End Date": app.endDate ? new Date(app.endDate).toISOString().split("T")[0] : "-",
      "Total Days": app.totalDays ?? 0,
      "Reason": app.reason || "-",
      "Status": app.status || "",
      "Manager Approved By": app.manager?.name || "-",
      "HR Approved By": app.hr?.name || "-",
      "Applied At": app.createdAt ? new Date(app.createdAt).toISOString().split("T")[0] : "-",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leave Applications");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="leave-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="leave-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Leave export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export leave applications" }, { status: 500 });
  }
}
