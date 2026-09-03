import React from "react";
import Link from "next/link";
import { getEstimations } from "@/app/actions/crm/estimation.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator, Plus, Search, Filter, ArrowRight, ShieldAlert } from "lucide-react";

interface EstimationsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    requirementId?: string;
  }>;
}

export default async function EstimationsDirectoryPage({ searchParams }: EstimationsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";
  const requirementId = params.requirementId || "";

  const res = await getEstimations(page, 15, search, status, requirementId);

  if (!res.success) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-lg text-destructive">Access Restricted</h3>
              <p className="text-sm text-muted-foreground">{res.error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { estimations, total, totalPages, currentPage } = res;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300">Draft</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">In Progress</Badge>;
      case "READY_FOR_REVIEW":
        return <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Review</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
      case "READY_FOR_QUOTATION":
        return <Badge className="bg-indigo-600 text-white">Ready for Quotation</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold tracking-tight">Internal Estimations</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Commercial costing, work breakdown, contingency buffer, and price recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/dashboard/crm/requirements">
              <Plus className="h-4 w-4 mr-2" />
              New Estimate from Requirement
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardDescription>Total Estimations</CardDescription>
            <CardTitle className="text-2xl font-bold">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardDescription>Approved Estimates</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {estimations.filter((e) => e.status === "APPROVED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardDescription>Ready for Quotation</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">
              {estimations.filter((e) => e.status === "READY_FOR_QUOTATION").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardDescription>Confidentiality Status</CardDescription>
            <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200">
              Data Firewall Active
            </Badge>
          </CardHeader>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search by estimation number or title..."
                defaultValue={search}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                name="status"
                defaultValue={status}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_FOR_REVIEW">Review</option>
                <option value="APPROVED">Approved</option>
                <option value="READY_FOR_QUOTATION">Ready for Quotation</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <Button type="submit" variant="secondary">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Estimations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate No.</TableHead>
                <TableHead>Title & Scope</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rec. Selling Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No estimation packages found.
                  </TableCell>
                </TableRow>
              ) : (
                estimations.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-semibold text-indigo-600 dark:text-indigo-400">
                      <Link href={`/dashboard/crm/estimations/${est.id}`} className="hover:underline">
                        {est.estimationNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground font-normal">v{est.version}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{est.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Prepared by: {est.PreparedBy?.name || "System"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/crm/requirements/${est.Requirement?.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {est.Requirement?.requirementNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{est.Client?.company || est.Client?.name}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(est.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {est.currency} {Number(est.recommendedPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/dashboard/crm/estimations/${est.id}`}>
                          View Builder
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground pt-4">
          <div>
            Page {currentPage} of {totalPages} ({total} estimations)
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/crm/estimations?page=${currentPage - 1}&search=${search}&status=${status}`}>
                  Previous
                </Link>
              </Button>
            )}
            {currentPage < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/crm/estimations?page=${currentPage + 1}&search=${search}&status=${status}`}>
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
