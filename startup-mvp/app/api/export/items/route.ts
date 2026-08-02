import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { arrayToCSV } from "@/lib/utils/export-csv";
import * as XLSX from "xlsx";
import { ItemType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const tab = searchParams.get("tab") || "all";
    const itemType = searchParams.get("itemType");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tab === "trash") {
      where.isTrash = true;
      where.status = "trash";
    } else {
      where.isTrash = false;
    }

    if (itemType && itemType !== "all") {
      where.itemType = itemType as ItemType;
    }

    const items = await prisma.item.findMany({
      where,
      select: {
        id: true,
        code: true,
        slug: true,
        name: true,
        description: true,
        itemType: true,
        costPrice: true,
        salesPrice: true,
        wholesalePrice: true,
        trackInventory: true,
        isEnableEcom: true,
        isVatEnabled: true,
        vatPercentage: true,
        barcode: true,
        status: true,
        createdAt: true,
        category: { select: { name: true } },
        subCategory: { select: { name: true } },
        brand: { select: { name: true } },
        unit: { select: { symbol: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedData = items.map((item) => ({
      "Item Code": item.code || "",
      "Item Name": item.name || "",
      "Item Type": item.itemType || "",
      "Category": item.category?.name || "-",
      "Sub Category": item.subCategory?.name || "-",
      "Brand": item.brand?.name || "-",
      "Unit": item.unit?.symbol || "-",
      "Cost Price": Number(item.costPrice || 0),
      "Sales Price": Number(item.salesPrice || 0),
      "Wholesale Price": Number(item.wholesalePrice || 0),
      "Track Inventory": item.trackInventory ? "Yes" : "No",
      "E-Commerce Enabled": item.isEnableEcom ? "Yes" : "No",
      "Barcode": item.barcode || "-",
      "VAT Enabled": item.isVatEnabled ? "Yes" : "No",
      "VAT Percentage": item.isVatEnabled ? `${Number(item.vatPercentage || 0)}%` : "0%",
      "Status": item.status || "",
      "Created At": item.createdAt ? new Date(item.createdAt).toISOString().split("T")[0] : "",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Items");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="items-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="items-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Items export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export items" }, { status: 500 });
  }
}
