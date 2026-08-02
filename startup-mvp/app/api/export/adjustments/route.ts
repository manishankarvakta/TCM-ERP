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

    const canView = await hasPermission(session.user.id, "inventory.adjustments", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const statusParam = searchParams.get("status") || undefined;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const where: any = {};
    if (warehouseId && warehouseId !== "all") {
      where.warehouseId = warehouseId;
    } else if (isNormalUser && user?.defaultWarehouseId) {
      where.warehouseId = user.defaultWarehouseId;
    }

    if (statusParam) where.status = statusParam;

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)) } : {}),
        ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { adjustmentNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where,
      include: {
        warehouse: { select: { name: true, code: true } },
        createdByUser: { select: { name: true } },
        items: {
          include: {
            item: { select: { name: true, code: true, unit: { select: { symbol: true } } } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const formattedData = adjustments.map((adj) => {
      const itemNames = adj.items.map((i: any) => `${i.item?.name || "Item"} (${Number(i.quantity) > 0 ? "+" : ""}${Number(i.quantity)})`).join("; ");
      const totalItemCount = adj.items.length;

      let inQty = 0;
      let outQty = 0;
      let inValue = 0;
      let outValue = 0;

      for (const item of adj.items) {
        const qty = Number(item.quantity || 0);
        const rate = Number(item.unitRate || 0);
        const itemVal = item.amount !== undefined && item.amount !== null ? Math.abs(Number(item.amount)) : Math.abs(qty * rate);

        if (qty > 0) {
          inQty += qty;
          inValue += itemVal;
        } else if (qty < 0) {
          outQty += Math.abs(qty);
          outValue += itemVal;
        }
      }

      const netDiffValue = inValue - outValue;

      return {
        "Adjustment No": adj.adjustmentNumber || "",
        "Date": adj.date ? new Date(adj.date).toISOString().split("T")[0] : "-",
        "Warehouse": adj.warehouse?.name || "-",
        "Status": adj.status || "",
        "Items Count": totalItemCount,
        "Items Detail": itemNames,
        "In Qty": inQty,
        "Out Qty": outQty,
        "In Value": inValue,
        "Out Value": outValue,
        "Net Difference Value (In - Out)": netDiffValue,
        "Created By": adj.createdByUser?.name || "-",
        "Notes": adj.notes || "-",
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Adjustments");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="adjustments-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="adjustments-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Adjustments export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export adjustments" }, { status: 500 });
  }
}
