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

    const canView = await hasPermission(session.user.id, "sales.sales", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const tab = searchParams.get("tab") || "all";
    const billerId = searchParams.get("billerId");
    const warehouseId = searchParams.get("warehouseId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const salesAssistantId = searchParams.get("salesAssistantId");

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    });

    const isAdmin = dbUser ? ["admin", "superadmin"].includes(dbUser.role.toLowerCase()) : false;

    const where: any = {
      isTrash: tab === "trash",
    };

    if (billerId && billerId !== "all") where.createdBy = billerId;
    if (salesAssistantId && salesAssistantId !== "all") where.salesAssistantId = salesAssistantId;

    if (!isAdmin && dbUser?.defaultWarehouseId) {
      where.warehouseId = dbUser.defaultWarehouseId;
    } else if (warehouseId && warehouseId !== "all") {
      where.warehouseId = warehouseId;
    }

    if (type && type !== "all") where.orderType = type;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
        { client: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        saleNumber: true,
        date: true,
        status: true,
        orderType: true,
        subTotal: true,
        discount: true,
        deliveryCharge: true,
        tax: true,
        grandTotal: true,
        isTrash: true,
        paymentDetails: true,
        _count: { select: { items: true } },
        client: { select: { name: true, phone: true } },
        warehouse: { select: { name: true } },
        createdByUser: { select: { name: true } },
        salesAssistant: { select: { name: true } },
      },
    });

    const formattedData = sales.map((sale) => {
      const details = (sale.paymentDetails as any) || {};
      const cashAmount = Number(details.cashAmount || 0);
      const cardAmount = Number(details.cardAmount || 0);
      const mfsAmount = Number(details.mfsAmount || 0);
      const changeAmount = Number(details.changeAmount || 0);
      const totalReceived = cashAmount + cardAmount + mfsAmount;

      return {
        "Sale Number": sale.saleNumber || "",
        "Date": sale.date ? new Date(sale.date).toISOString().split("T")[0] : "",
        "Customer Name": sale.client?.name || "-",
        "Customer Phone": sale.client?.phone || "-",
        "Warehouse": sale.warehouse?.name || "-",
        "Order Type": sale.orderType || "-",
        "Total Items": sale._count?.items ?? 0,
        "Sub Total": Number(sale.subTotal || 0),
        "Discount": Number(sale.discount || 0),
        "Delivery Charge": Number(sale.deliveryCharge || 0),
        "Tax": Number(sale.tax || 0),
        "Grand Total": Number(sale.grandTotal || 0),
        "Cash Paid": cashAmount,
        "Card Paid": cardAmount,
        "MFS Paid": mfsAmount,
        "Total Received": totalReceived,
        "Change Amount": changeAmount,
        "Status": sale.status || "",
        "Biller": sale.createdByUser?.name || "-",
        "Sales Assistant": sale.salesAssistant?.name || "-",
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="sales-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sales-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Sales export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export sales" }, { status: 500 });
  }
}
