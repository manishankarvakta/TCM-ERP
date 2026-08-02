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

    const canView = await hasPermission(session.user.id, "hr.holidays", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const tab = searchParams.get("tab") || "all";

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (tab === "trash") {
      where.isTrash = true;
    } else if (tab === "active") {
      where.isTrash = false;
      where.status = "active";
    } else if (tab === "inactive") {
      where.isTrash = false;
      where.status = "inactive";
    } else {
      where.isTrash = false;
    }

    const holidays = await prisma.holiday.findMany({
      where,
      include: {
        warehouse: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    const formattedData = holidays.map((h) => ({
      "Holiday Name": h.name || "",
      "Date": h.date ? new Date(h.date).toISOString().split("T")[0] : "-",
      "Warehouse": h.warehouse?.name || "All Warehouses",
      "Status": h.status || "",
      "Created At": h.createdAt ? new Date(h.createdAt).toISOString().split("T")[0] : "-",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Holidays");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="holidays-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="holidays-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Holidays export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export holidays" }, { status: 500 });
  }
}
