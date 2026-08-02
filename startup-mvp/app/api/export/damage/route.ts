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

    const canView = await hasPermission(session.user.id, "inventory.damage", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const tab = searchParams.get("tab") || "active";
    const isTrash = tab === "trash";

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const where: any = { isTrash };
    if (warehouseId && warehouseId !== "all") {
      where.warehouseId = warehouseId;
    } else if (isNormalUser && user?.defaultWarehouseId) {
      where.warehouseId = user.defaultWarehouseId;
    }

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)) } : {}),
        ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { damageNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const damages = await prisma.inventoryDamage.findMany({
      where,
      include: {
        warehouse: { select: { name: true, code: true } },
        createdByUser: { select: { name: true } },
        items: {
          include: {
            item: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const formattedData = damages.map((d) => {
      const itemNames = d.items.map((i) => `${i.item?.name || "Item"} (${Number(i.quantity)})`).join("; ");
      const totalItemCount = d.items.length;
      const totalAmount = d.items.reduce((sum, i) => sum + Number(i.amount || 0), 0);

      return {
        "Damage No": d.damageNumber || "",
        "Date": d.date ? new Date(d.date).toISOString().split("T")[0] : "-",
        "Warehouse": d.warehouse?.name || "-",
        "Status": d.status || "",
        "Items Count": totalItemCount,
        "Items Detail": itemNames,
        "Total Amount": totalAmount,
        "Created By": d.createdByUser?.name || "-",
        "Notes": d.notes || "-",
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Damage");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="damage-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="damage-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Damage export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export damages" }, { status: 500 });
  }
}
