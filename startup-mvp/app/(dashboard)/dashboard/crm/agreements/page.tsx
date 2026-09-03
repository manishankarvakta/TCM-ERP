import React from "react";
import Link from "next/link";
import { getAgreements } from "@/app/actions/crm/agreement.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Search, ShieldCheck, CheckCircle2, Clock, FileCheck } from "lucide-react";

export const metadata = {
  title: "Agreements & Contracts | CRM",
  description: "Manage commercial agreements and client contracts",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function AgreementsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const result = await getAgreements(page, 10, search, status);
  const { agreements, total, totalPages } = result;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "ACTIVE":
      case "SIGNED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">{st}</Badge>;
      case "ACCEPTED":
      case "READY_FOR_CLIENT":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">{st}</Badge>;
      case "INTERNAL_REVIEW":
      case "SENT":
      case "CLIENT_REVIEW":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium">{st}</Badge>;
      case "DRAFT":
        return <Badge variant="outline" className="text-slate-600 dark:text-slate-400 border-slate-300">{st}</Badge>;
      case "TERMINATED":
      case "CANCELLED":
      case "REJECTED":
        return <Badge variant="destructive">{st}</Badge>;
      default:
        return <Badge variant="secondary">{st}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            Agreements & Commercial Contracts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Formal commercial agreements, client sign-offs, and legally effective contracts.
          </p>
        </div>
        <Link href="/dashboard/crm/quotations">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
            <Plus className="h-4 w-4" />
            New Agreement from Quotation
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Agreements</CardTitle>
            <FileText className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active / Signed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {agreements.filter((a) => a.status === "ACTIVE" || a.status === "SIGNED").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">In Client Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {agreements.filter((a) => a.status === "SENT" || a.status === "CLIENT_REVIEW").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Draft / Internal</CardTitle>
            <FileCheck className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              {agreements.filter((a) => a.status === "DRAFT" || a.status === "INTERNAL_REVIEW").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <form className="flex flex-1 items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search agreement number or title..."
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Agreements Directory Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                <TableHead className="font-semibold">Agreement No.</TableHead>
                <TableHead className="font-semibold">Title & Client</TableHead>
                <TableHead className="font-semibold">Quotation Ref</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Contract Value</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No agreements found. Create one from an accepted commercial Quotation.
                  </TableCell>
                </TableRow>
              ) : (
                agreements.map((agreement) => (
                  <TableRow key={agreement.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <TableCell className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {agreement.agreementNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{agreement.title}</div>
                      <div className="text-xs text-slate-500">{agreement.Client?.name || agreement.Client?.company}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {agreement.Quotation?.quotationNumber}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {agreement.agreementType}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      {agreement.currency} {Number(agreement.contractValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(agreement.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/crm/agreements/${agreement.id}`}>
                        <Button variant="ghost" size="sm">
                          View Detail
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-slate-500 pt-2">
          <div>Page {page} of {totalPages} ({total} agreements)</div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/dashboard/crm/agreements?page=${page - 1}&search=${search}&status=${status}`}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/dashboard/crm/agreements?page=${page + 1}&search=${search}&status=${status}`}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
