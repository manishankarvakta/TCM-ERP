import { getVoucherById } from "../_actions/voucher.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";
import VoucherPrintAction from "../_components/print/voucher-print-action";
import { prisma } from "@/lib/prisma";

interface VoucherDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function getStatusColor(status: string) {
  switch (status) {
    case "posted":
      return "bg-green-100 text-green-800";
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "SALES":
      return "bg-blue-100 text-blue-800";
    case "PURCHASE":
      return "bg-purple-100 text-purple-800";
    case "PAYMENT":
      return "bg-red-100 text-red-800";
    case "RECEIPT":
      return "bg-green-100 text-green-800";
    case "JOURNAL":
      return "bg-orange-100 text-orange-800";
    case "CONTRA":
      return "bg-pink-100 text-pink-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function VoucherDetailPage({ params }: VoucherDetailPageProps) {
  const { id } = await params;
  const result = await getVoucherById(id);

  if (!result.success || !result.voucher) {
    notFound();
  }

  const voucher = result.voucher;

  // Fetch POS settings & active Organization as header branding fallback
  const [posSettingsRaw, activeOrg] = await Promise.all([
    prisma.settings.findFirst({
      where: {
        code: "pos_settings",
        userId: null,
        isGlobal: true,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.organization.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    }).catch(() => null),
  ]);
  const posSettings = posSettingsRaw?.settings ? (posSettingsRaw.settings as any) : null;

  // Resolve Client & Supplier data from voucher root or voucherLines
  const client = voucher.client || voucher.voucherLines?.find((l: any) => l.client)?.client || null;
  const supplier = voucher.supplier || voucher.voucherLines?.find((l: any) => l.supplier)?.supplier || null;

  // Calculate Due Summary (Previous Due, Paid Amount, Remaining Due) if client or supplier is attached
  let dueSummary: { previousDue: number; paidAmount: number; remainingDue: number } | null = null;

  if (client) {
    const coaId = client.chartOfAccountId;
    const balanceResult = await prisma.journalEntryLine.aggregate({
      where: {
        OR: [
          ...(coaId ? [{ chartOfAccountId: coaId }] : []),
          { clientId: client.id },
        ],
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const totalDebit = Number(balanceResult._sum.debitAmount || 0);
    const totalCredit = Number(balanceResult._sum.creditAmount || 0);
    let netDue = totalDebit - totalCredit;

    const hasOpeningJournal = await prisma.journalEntryLine.findFirst({
      where: {
        OR: [
          ...(coaId ? [{ chartOfAccountId: coaId }] : []),
          { clientId: client.id },
        ],
        description: { contains: "opening balance", mode: "insensitive" },
      },
    });

    if (Number(client.openingBalance || 0) > 0 && !hasOpeningJournal) {
      netDue += Number(client.openingBalance || 0);
    }

    const currentRemainingDue = Math.max(0, Number(netDue.toFixed(2)));
    const paidInThisVoucher = voucher.voucherLines.reduce(
      (sum: number, line: any) => sum + Number(line.debitAmount || line.creditAmount || 0),
      0
    );
    const previousDue = Number((currentRemainingDue + paidInThisVoucher).toFixed(2));

    dueSummary = {
      previousDue,
      paidAmount: paidInThisVoucher,
      remainingDue: currentRemainingDue,
    };
  } else if (supplier) {
    const balanceResult = await prisma.journalEntryLine.aggregate({
      where: { supplierId: supplier.id },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const totalDebit = Number(balanceResult._sum.debitAmount || 0);
    const totalCredit = Number(balanceResult._sum.creditAmount || 0);
    const currentRemainingPayable = Math.max(0, Number((totalCredit - totalDebit).toFixed(2)));
    const paidInThisVoucher = voucher.voucherLines.reduce(
      (sum: number, line: any) => sum + Number(line.debitAmount || line.creditAmount || 0),
      0
    );
    const previousDue = Number((currentRemainingPayable + paidInThisVoucher).toFixed(2));

    dueSummary = {
      previousDue,
      paidAmount: paidInThisVoucher,
      remainingDue: currentRemainingPayable,
    };
  }
   
  // Construct dynamic print data matching VoucherPrintTemplate requirements
  const printVoucherData = {
    id: voucher.id,
    voucherNumber: voucher.voucherNumber,
    date: voucher.date,
    type: voucher.type,
    description: voucher.description,
    reference: voucher.reference,
    status: voucher.status,
    organization: voucher.organization ? {
      name: voucher.organization.name,
      address: voucher.organization.address,
      phone: voucher.organization.phone,
      email: voucher.organization.email,
      website: voucher.organization.website,
      logo: voucher.organization.logo || "/main_logo.png",
    } : activeOrg ? {
      name: activeOrg.name,
      address: activeOrg.address,
      phone: activeOrg.phone,
      email: activeOrg.email,
      website: activeOrg.website,
      logo: activeOrg.logo || "/main_logo.png",
    } : {
      name: posSettings?.headerText || "TCM",
      address: posSettings?.subHeaderText || "",
      phone: posSettings?.phone || "",
      email: posSettings?.email || "",
      website: null,
      logo: posSettings?.logoUrl || "/main_logo.png",
    },
    client: client ? {
      name: client.name || null,
      email: client.email || "",
      phone: client.phone || null,
      address: client.address || null,
    } : null,
    supplier: supplier ? {
      name: supplier.name || null,
      email: supplier.email || "",
      phone: supplier.phone || null,
      address: supplier.address || null,
    } : null,
    creatorName: voucher.creator?.name || "System",
    postedByName: voucher.postedBy?.name || null,
    dueSummary,
    lines: voucher.voucherLines.map((line: any) => ({
      lineNumber: line.lineNumber,
      description: line.description,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
      account: {
        name: line.chartOfAccount.name,
        code: line.chartOfAccount.code,
      },
    })),
  };

  const totalDebit = voucher.voucherLines.reduce((sum: number, line: any) => sum + line.debitAmount, 0);
  const totalCredit = voucher.voucherLines.reduce((sum: number, line: any) => sum + line.creditAmount, 0);

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/accounts/vouchers">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Vouchers
            </Link>
          </Button>
          <VoucherPrintAction voucher={printVoucherData} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{voucher.voucherNumber}</CardTitle>
                <CardDescription>Voucher Details</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={getTypeColor(voucher.type)}>{voucher.type}</Badge>
                <Badge className={getStatusColor(voucher.status)}>{voucher.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(voucher.date), "MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reference</p>
                <p className="font-medium">{voucher.reference || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created By</p>
                <p className="font-medium">{voucher.creator.name}</p>
              </div>
              {voucher.postedAt && (
                <div>
                  <p className="text-muted-foreground">Posted At</p>
                  <p className="font-medium">
                    {format(new Date(voucher.postedAt), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
            {voucher.description && (
              <div className="mt-4">
                <p className="text-muted-foreground text-sm">Description</p>
                <p className="mt-1">{voucher.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voucher Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voucher.voucherLines.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.lineNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {line.chartOfAccount.code} - {line.chartOfAccount.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {line.chartOfAccount.type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {line.debitAmount > 0 ? line.debitAmount.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {line.creditAmount > 0 ? line.creditAmount.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={2} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right">{totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{totalCredit.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {voucher.journalEntries && voucher.journalEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {voucher.journalEntries.map((entry: any) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">{entry.entryNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge className={entry.status === "posted" ? "bg-green-100 text-green-800" : ""}>
                        {entry.status}
                      </Badge>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground mb-4">{entry.description}</p>
                    )}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entry.journalEntryLines.map((line: any) => (
                            <TableRow key={line.id}>
                              <TableCell className="font-medium">{line.lineNumber}</TableCell>
                              <TableCell>
                                {line.chartOfAccount.code} - {line.chartOfAccount.name}
                              </TableCell>
                              <TableCell className="text-right">
                                {line.debitAmount > 0 ? line.debitAmount.toFixed(2) : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {line.creditAmount > 0 ? line.creditAmount.toFixed(2) : "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {line.description || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageGuard>
  );
}

