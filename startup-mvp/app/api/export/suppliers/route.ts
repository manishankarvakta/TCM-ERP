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

    const canView = await hasPermission(session.user.id, "peoples.suppliers", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const tab = searchParams.get("tab") || "all";
    const warehouseId = searchParams.get("warehouse");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { supplierCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tab === "trash") {
      where.status = "trash";
    } else {
      where.status = { not: "trash" };
    }

    if (warehouseId && warehouseId !== "all") {
      where.warehouseId = warehouseId;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        supplierCode: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        openingBalance: true,
        status: true,
        warehouse: { select: { name: true } },
        createdByUser: { select: { name: true } },
        ChartOfAccount: { select: { id: true } },
        createdAt: true,
      },
    });

    const suppliersWithPayable = await Promise.all(
      suppliers.map(async (supplier) => {
        let payableAmount = 0;
        const coaId = supplier.ChartOfAccount?.id;
        if (coaId) {
          const balanceResult = await prisma.journalEntryLine.aggregate({
            where: { chartOfAccountId: coaId },
            _sum: { debitAmount: true, creditAmount: true },
          });
          const totalDebit = Number(balanceResult._sum.debitAmount || 0);
          const totalCredit = Number(balanceResult._sum.creditAmount || 0);
          payableAmount = totalCredit - totalDebit;
        }

        return {
          ...supplier,
          openingBalance: Number(supplier.openingBalance || 0),
          payableAmount,
        };
      })
    );

    const formattedData = suppliersWithPayable.map((s) => ({
      "Supplier Code": s.supplierCode || "",
      "Supplier Name": s.name || "",
      "Company": s.company || "-",
      "Phone": s.phone || "-",
      "Email": s.email || "-",
      "Warehouse": s.warehouse?.name || "-",
      "Opening Balance": s.openingBalance,
      "Current Payable": s.payableAmount,
      "Status": s.status || "",
      "Address": s.address || "-",
      "City": s.city || "-",
      "Created At": s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="suppliers-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="suppliers-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Suppliers export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export suppliers" }, { status: 500 });
  }
}
