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

    const canView = await hasPermission(session.user.id, "peoples.clients", "view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || "";
    const tab = searchParams.get("tab") || "all";
    const warehouseId = searchParams.get("warehouse");
    const dueStatus = searchParams.get("due");
    const clientType = searchParams.get("clientType");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { clientCode: { contains: search, mode: "insensitive" } },
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

    if (clientType && clientType !== "all") {
      where.clientType = clientType;
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        clientCode: true,
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
        clientType: true,
        membershipTier: true,
        membershipPoints: true,
        warehouse: { select: { name: true } },
        createdByUser: { select: { name: true } },
        ChartOfAccount: { select: { id: true } },
        createdAt: true,
      },
    });

    const coaIds = clients.map((c) => c.ChartOfAccount?.id).filter(Boolean) as string[];

    // Batch aggregate all journal entry lines in 1 single query for maximum performance
    const [journalAggregates, openingJournals] = await Promise.all([
      coaIds.length > 0
        ? prisma.journalEntryLine.groupBy({
            by: ["chartOfAccountId"],
            where: { chartOfAccountId: { in: coaIds } },
            _sum: { debitAmount: true, creditAmount: true },
          })
        : [],
      coaIds.length > 0
        ? prisma.journalEntryLine.findMany({
            where: {
              chartOfAccountId: { in: coaIds },
              description: { contains: "opening balance", mode: "insensitive" },
            },
            select: { chartOfAccountId: true },
          })
        : [],
    ]);

    const journalMap = new Map<string, { debit: number; credit: number }>();
    journalAggregates.forEach((j) => {
      if (j.chartOfAccountId) {
        journalMap.set(j.chartOfAccountId, {
          debit: Number(j._sum.debitAmount || 0),
          credit: Number(j._sum.creditAmount || 0),
        });
      }
    });

    const openingJournalSet = new Set(openingJournals.map((o) => o.chartOfAccountId));

    const clientsWithDue = clients.map((client) => {
      let due = 0;
      const coaId = client.ChartOfAccount?.id;
      if (coaId && journalMap.has(coaId)) {
        const j = journalMap.get(coaId)!;
        due = j.debit - j.credit;
      }
      if (Number(client.openingBalance || 0) > 0 && (!coaId || !openingJournalSet.has(coaId))) {
        due += Number(client.openingBalance || 0);
      }

      return {
        ...client,
        openingBalance: Number(client.openingBalance || 0),
        dueAmount: Math.max(0, due),
      };
    });

    const filteredClients = clientsWithDue.filter((c) => {
      if (dueStatus === "has_due") return c.dueAmount > 0;
      if (dueStatus === "no_due") return c.dueAmount <= 0;
      return true;
    });

    const formattedData = filteredClients.map((c) => ({
      "Client Code": c.clientCode || "",
      "Client Name": c.name || "",
      "Company": c.company || "-",
      "Phone": c.phone || "-",
      "Email": c.email || "-",
      "Client Type": c.clientType || "Regular",
      "Warehouse": c.warehouse?.name || "-",
      "Opening Balance": c.openingBalance,
      "Current Due": c.dueAmount,
      "Membership Tier": c.membershipTier || "-",
      "Membership Points": c.membershipPoints ?? 0,
      "Status": c.status || "",
      "Address": c.address || "-",
      "City": c.city || "-",
      "Created At": c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
    }));

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "excel" || format === "xlsx") {
      const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      const rows = [headers, ...formattedData.map((row: any) => headers.map((h) => row[h]))];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="clients-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      const csvString = arrayToCSV(formattedData);
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="clients-export-${dateStr}.csv"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Clients export API error:", err);
    return NextResponse.json({ error: err.message || "Failed to export clients" }, { status: 500 });
  }
}
