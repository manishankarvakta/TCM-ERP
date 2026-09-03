import React from "react";
import Link from "next/link";
import { getProjectHandovers } from "@/app/actions/crm/project-handover.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Search, ArrowRight, CheckCircle2, AlertCircle, Clock, ShieldCheck, FolderPlus } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function ProjectHandoversPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const { success, handovers, total, error } = await getProjectHandovers(page, 10, search, status);

  if (!success) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">{error || "Failed to load project handovers"}</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">DRAFT</Badge>;
      case "SUBMITTED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">SUBMITTED</Badge>;
      case "ACCEPTED":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">ACCEPTED</Badge>;
      case "PROJECT_CREATED":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">PROJECT CREATED</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">REJECTED</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-300">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales-to-Project Handovers</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Commercial scope transfer packages from Commercial Sales into Project Operations.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Handovers</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Total commercial transfer packages</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">Accepted / In Review</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {handovers?.filter(h => h.status === "SUBMITTED" || h.status === "ACCEPTED").length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Pending project initialization</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">Projects Created</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">
              {handovers?.filter(h => h.status === "PROJECT_CREATED").length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Transferred into active Projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <form method="GET" action="/dashboard/crm/project-handovers">
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search by handover number or description..."
              className="pl-9 bg-white border-slate-200"
            />
          </form>
        </div>
      </div>

      {/* List Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Handover Number</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Service Sale Ref</th>
                <th className="px-6 py-4 text-right">Contract Snapshot</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {handovers && handovers.length > 0 ? (
                handovers.map((hdo) => (
                  <tr key={hdo.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600">
                      <Link href={`/dashboard/crm/project-handovers/${hdo.id}`} className="hover:underline">
                        {hdo.handoverNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {hdo.Client?.name || hdo.Client?.company || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {hdo.sourceServiceSaleNumberSnapshot}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 font-mono">
                      {hdo.currency} {Number(hdo.contractValueSnapshot).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(hdo.status)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-semibold">
                      {hdo.Project?.projectNumber || hdo.Project?.title || (
                        <span className="text-slate-400 font-normal">Not Created</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/crm/project-handovers/${hdo.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-slate-600 hover:text-indigo-600">
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No sales-to-project handovers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
