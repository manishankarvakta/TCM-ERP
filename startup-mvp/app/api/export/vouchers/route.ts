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

    const canView = (await hasPermission(session.user.id, "accounts.vouchers", "read")) ||
                    (await hasPermission(session.user.id, "accounts.vouchers", "view"));

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const tab = searchParams.get("tab") || "all";
    const type = searchParams.get("type");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const warehouseId = searchParams.get("warehouseId");

    const where: any = {};

    if (search) {
      where.OR = [
        { voucherNumber: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tab === "draft") {
      where.status = "draft";
    } else if (tab === "posted") {
      where.status = "posted";
    } else if (tab === "cancelled") {
      where.status = "cancelled";
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    if (warehouseId && warehouseId !== "all") {
      if (warehouseId === "none") {
        where.id = "none";
      } else {
        where.OR = [
          { warehouseId },
          { sales: { some: { warehouseId } } },
          { purchases: { some: { warehouseId } } },
          { productionOrders: { some: { warehouseId } } },
          { inventoryAdjustment: { warehouseId } },
          { inventoryDamage: { warehouseId } },
          { grns: { some: { warehouseId } } },
          { returnToVendors: { some: { warehouseId } } },
          {
            User_Voucher_createdByToUser: {
              defaultWarehouseId: warehouseId,
            },
          },
          {
            VoucherLine: {
              some: {
                ChartOfAccount: {
                  CashBankAccount: {
                    warehouses: {
                      some: { id: warehouseId },
                    },
                  },
                },
              },
            },
          },
        ];
      }
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        voucherNumber: true,
        date: true,
        type: true,
        reference: true,
        description: true,
        status: true,
        postedAt: true,
        User_Voucher_createdByToUser: { select: { name: true } },
        User_Voucher_postedByIdToUser: { select: { name: true } },
        Client: { select: { name: true } },
        Supplier: { select: { name: true } },
        Organization: { select: { name: true } },
        VoucherLine: {
          select: {
            debitAmount: true,
            creditAmount: true,
          },
        },
      },
    });

    const formattedData = vouchers.map((v) => {
      const totalAmount = v.VoucherLine.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
      const partyName = v.Client?.name || v.Supplier?.name || v.Organization?.name || "-";

      return {
        "Voucher Number": v.voucherNumber || "",
        "Date": v.date ? new Date(v.date).toISOString().split("T")[0] : "",
        "Type": v.type || "",
        "Total Amount": totalAmount,
        "Status": v.status || "",
        "Party": partyName,
        "Reference": v.reference || "-",
        "Description": v.description || "-",
        "Created By": v.User_Voucher_createdByToUser?.name || "-",
        "Posted By": v.User_Voucher_postedByIdToUser?.name || "-",
        "Posted At": v.postedAt ? new Date(v.postedAt).toISOString().split("T")[0] : "-",
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vouchers");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="vouchers-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="vouchers-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Vouchers export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export vouchers" }, { status: 500 });
  }
}
