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

    const canView = await hasPermission(session.user.id, "master.categories", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const tab = searchParams.get("tab") || "all";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tab === "trash") {
      where.status = "trash";
    } else {
      where.status = { not: "trash" };
    }

    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        parentId: true,
        parent: { select: { name: true } },
        _count: { select: { items: true, children: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedData = categories.map((cat) => ({
      "Category Name": cat.name || "",
      "Type": cat.parentId ? "Sub-Category" : "Primary Category",
      "Parent Category": cat.parent?.name || "-",
      "Description": cat.description || "-",
      "Total Items": cat._count?.items ?? 0,
      "Sub-Categories": cat._count?.children ?? 0,
      "Status": cat.status || "",
      "Created At": cat.createdAt ? new Date(cat.createdAt).toISOString().split("T")[0] : "",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Categories");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="categories-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="categories-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Categories export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export categories" }, { status: 500 });
  }
}
