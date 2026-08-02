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

    const canView = await hasPermission(session.user.id, "inventory.stock", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const itemId = searchParams.get("itemId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    });

    const where: any = {};

    if (itemId) {
      where.itemId = itemId;
    }

    if (user && user.role !== "admin") {
      where.warehouseId = user.defaultWarehouseId || "unassigned-no-match";
      if (warehouseId && warehouseId !== user.defaultWarehouseId) {
        where.warehouseId = "unassigned-no-match";
      }
    } else if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    where.AND = [
      ...(search
        ? [
            {
              OR: [
                { item: { name: { contains: search, mode: "insensitive" } } },
                { item: { code: { contains: search, mode: "insensitive" } } },
                { item: { barcode: { contains: search, mode: "insensitive" } } },
                { variant: { sku: { contains: search, mode: "insensitive" } } },
                { variant: { barcode: { contains: search, mode: "insensitive" } } },
                { variant: { item: { name: { contains: search, mode: "insensitive" } } } },
                { variant: { item: { code: { contains: search, mode: "insensitive" } } } },
                { variant: { item: { barcode: { contains: search, mode: "insensitive" } } } },
                { warehouse: { name: { contains: search, mode: "insensitive" } } },
                { warehouse: { code: { contains: search, mode: "insensitive" } } },
              ],
            },
          ]
        : []),
      {
        OR: [
          {
            item: {
              isTrash: false,
              status: "active",
              trackInventory: true,
            },
          },
          {
            variant: {
              item: {
                isTrash: false,
                status: "active",
                trackInventory: true,
              },
            },
          },
        ],
      },
    ];

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        item: {
          select: {
            name: true,
            code: true,
            itemType: true,
            costPrice: true,
            salesPrice: true,
            wholesalePrice: true,
            category: { select: { name: true } },
            unit: { select: { symbol: true } },
          },
        },
        variant: {
          select: {
            sku: true,
            costPrice: true,
            salesPrice: true,
            wholesalePrice: true,
            item: {
              select: {
                name: true,
                code: true,
                itemType: true,
                salesPrice: true,
                wholesalePrice: true,
                category: { select: { name: true } },
                unit: { select: { symbol: true } },
              },
            },
          },
        },
        warehouse: { select: { name: true, code: true } },
      },
      orderBy: [
        { warehouse: { name: "asc" } },
      ],
    });

    const formattedData = stocks.map((s) => {
      const itemName = s.item?.name || s.variant?.item?.name || "-";
      const itemCode = s.item?.code || s.variant?.item?.code || s.variant?.sku || "-";
      const itemType = s.item?.itemType || s.variant?.item?.itemType || "-";
      const category = s.item?.category?.name || s.variant?.item?.category?.name || "-";
      const unit = s.item?.unit?.symbol || s.variant?.item?.unit?.symbol || "-";
      const qty = Number(s.quantity || 0);
      const reservedQty = Number(s.reservedQuantity || 0);
      
      const costPrice = Number(s.variant?.costPrice || s.item?.costPrice || 0);
      const salesPrice = Number(s.variant?.salesPrice || s.item?.salesPrice || s.variant?.item?.salesPrice || 0);
      const wholesalePrice = Number(s.variant?.wholesalePrice || s.item?.wholesalePrice || s.variant?.item?.wholesalePrice || 0);

      const totalCostValue = qty * costPrice;
      const totalSalesValue = qty * salesPrice;
      const totalWholesaleValue = qty * wholesalePrice;

      return {
        "Item Code": itemCode,
        "Item Name": itemName,
        "Item Type": itemType,
        "Category": category,
        "Warehouse": s.warehouse?.name || "-",
        "Quantity": qty,
        "Reserved Quantity": reservedQty,
        "Unit": unit,
        "Cost Price": costPrice,
        "Total Cost Value": totalCostValue,
        "Sales Price": salesPrice,
        "Total Sales Value": totalSalesValue,
        "Wholesale Price": wholesalePrice,
        "Total Wholesale Value": totalWholesaleValue,
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Stock");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="stock-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="stock-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Stock export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export stock" }, { status: 500 });
  }
}
