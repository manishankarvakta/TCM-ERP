import Link from "next/link";
import { getRequirements } from "@/app/actions/crm/requirement.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileCheck, HelpCircle, Layers, CheckCircle2, Clock } from "lucide-react";

interface RequirementsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    priority?: string;
    opportunityId?: string;
  }>;
}

export default async function RequirementsDirectoryPage({ searchParams }: RequirementsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";
  const priority = params.priority || "all";
  const opportunityId = params.opportunityId;

  const result = await getRequirements(page, 15, search, status, priority, opportunityId);
  const requirements = result.success ? result.requirements : [];
  const total = result.success ? result.total : 0;

  function getStatusBadge(st: string) {
    switch (st) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300">Draft</Badge>;
      case "DISCOVERY":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300">Discovery</Badge>;
      case "WAITING_CLIENT":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300">Waiting Client</Badge>;
      case "CONFIRMED":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">Confirmed</Badge>;
      case "READY_FOR_ESTIMATION":
        return <Badge variant="default" className="bg-indigo-600 text-white hover:bg-indigo-700">Ready for Estimation</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  }

  function getPriorityBadge(pr: string) {
    switch (pr) {
      case "URGENT":
        return <Badge className="bg-rose-500 text-white font-semibold">URGENT</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-500 text-white">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary">MEDIUM</Badge>;
      case "LOW":
        return <Badge variant="outline" className="text-muted-foreground">LOW</Badge>;
      default:
        return <Badge variant="outline">{pr}</Badge>;
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Requirements & Scope Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture, structure, and validate client requirement packages before estimation and quotation.
          </p>
        </div>
        <Link href="/dashboard/crm/requirements/new">
          <Button className="bg-primary text-primary-foreground shadow flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Requirement
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Requirements</CardTitle>
            <FileCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Active Discovery</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold text-blue-600">
              {requirements.filter(r => r.status === "DISCOVERY" || r.status === "DRAFT").length}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Ready for Estimation</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold text-emerald-600">
              {requirements.filter(r => r.status === "READY_FOR_ESTIMATION").length}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Open Clarifications</CardTitle>
            <HelpCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold text-amber-600">
              {requirements.reduce((sum, r) => sum + (r._count?.Clarifications || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directory Table Card */}
      <Card className="shadow">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Requirements Directory</CardTitle>
            <form className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search REQ #, title, client..."
                  defaultValue={search}
                  className="pl-8 text-sm"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">Filter</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">REQ Number</TableHead>
                <TableHead className="font-semibold">Requirement Title</TableHead>
                <TableHead className="font-semibold">Client / Opportunity</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Scope Items</TableHead>
                <TableHead className="font-semibold">Open Clarifications</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No requirements found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                requirements.map((req) => (
                  <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {req.requirementNumber}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/dashboard/crm/requirements/${req.id}`} className="hover:underline font-semibold">
                        {req.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{req.Client?.name || req.Client?.company}</div>
                      <div className="text-muted-foreground font-mono">{req.Opportunity?.title} ({req.Opportunity?.opportunityNumber})</div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(req.priority)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      <div className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{req._count?.Items || 0} items ({req._count?.Sections || 0} sections)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {req._count?.Clarifications > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          {req._count.Clarifications} Open
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/crm/requirements/${req.id}`}>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-indigo-600 hover:text-indigo-700">
                          Open Builder
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
    </div>
  );
}
