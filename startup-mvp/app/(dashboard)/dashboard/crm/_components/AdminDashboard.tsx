"use client";

import { useEffect, useState, useTransition } from "react";
import { getAdminCrmMetrics } from "@/app/actions/crm/crm-dashboard.action";
import { FiTrendingUp, FiTarget, FiDollarSign, FiUsers, FiActivity } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getAdminCrmMetrics();
      if (result.success) {
        setMetrics(result.metrics);
      }
    });
  }, []);

  if (!metrics && isPending) {
    return <AdminDashboardSkeleton />;
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed rounded-lg bg-muted/10">
        <p className="text-muted-foreground">Failed to load CRM data.</p>
      </div>
    );
  }

  // Calculate Win Rate
  const totalClosed = metrics.wonCount + (metrics.funnel.LOST || 0);
  const winRate = totalClosed > 0 ? Math.round((metrics.wonCount / totalClosed) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pipeline */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight">Active Pipeline</h3>
                  <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <FiDollarSign className="text-blue-600 dark:text-blue-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCurrency(metrics.pipelineValue)}
                    </h2>
                </div>
                <p className="text-sm text-slate-500 mt-2 font-medium">Across {metrics.pipelineCount} open opportunities</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* Total Won */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight">Closed Won Value</h3>
                  <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <FiTrendingUp className="text-emerald-600 dark:text-emerald-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCurrency(metrics.wonValue)}
                    </h2>
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-2 font-medium flex items-center gap-1">
                    Win Rate: {winRate}%
                </p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* New Leads */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight">New Leads (This Month)</h3>
                  <div className="h-10 w-10 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                      <FiUsers className="text-violet-600 dark:text-violet-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {metrics.newLeadsMonth}
                    </h2>
                </div>
                <p className="text-sm text-slate-500 mt-2 font-medium">New prospects added</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 to-purple-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* Target Progress */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight">Deals Won</h3>
                  <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <FiTarget className="text-amber-600 dark:text-amber-400 h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {metrics.wonCount}
                    </h2>
                </div>
                <p className="text-sm text-slate-500 mt-2 font-medium">Total successful deals</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Pipeline Funnel</h3>
          <div className="flex-1 min-h-[250px] flex items-end gap-2 justify-between">
            {Object.entries(metrics.funnel).map(([stage, count]: any) => {
              const maxCount = Math.max(...Object.values(metrics.funnel) as number[], 1);
              const heightPercentage = Math.max(((count as number) / maxCount) * 100, 5); // ensures a minimum height to be visible
              
              let bgColor = "bg-slate-200 dark:bg-slate-800";
              if (stage === "WON") bgColor = "bg-emerald-500";
              else if (stage === "NEGOTIATION") bgColor = "bg-amber-500";
              else if (stage === "PROPOSAL") bgColor = "bg-blue-500";
              else if (stage === "QUALIFICATION") bgColor = "bg-violet-500";
              else if (stage === "DISCOVERY") bgColor = "bg-cyan-500";

              return (
                <div key={stage} className="flex flex-col items-center flex-1 group pt-10">
                    <div className="w-full flex-1 relative flex flex-col justify-end min-h-[200px]">
                        <div 
                            className={`w-full mx-auto max-w-[60px] rounded-t-lg transition-all duration-300 ${bgColor} hover:opacity-80 relative`} 
                            style={{ height: `${heightPercentage}%`, minHeight: '20px' }}
                        >
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 z-10 text-white text-xs py-1 px-2 rounded font-bold whitespace-nowrap transition-opacity">
                                {count} deals
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider text-center break-words w-full px-1">
                        {stage.substring(0, 4)} {/* Shorten for display */}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {count}
                    </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Leads</h3>
            <Link href="/dashboard/crm/leads" className="text-sm font-semibold text-primary hover:underline">
                View All
            </Link>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            {metrics.recentLeads.length > 0 ? (
                metrics.recentLeads.map((lead: any) => (
                    <Link key={lead.id} href={`/dashboard/crm/leads/${lead.id}`}>
                        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-primary font-bold">{lead.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{lead.name}</p>
                                <p className="text-xs font-medium text-slate-500 truncate">{lead.company || "No Company"}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <Badge variant="outline" className="text-[10px] capitalize">
                                    {lead.status.toLowerCase()}
                                </Badge>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <FiUsers className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-500">No recent leads found.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between mb-4">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[350px] rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
      </div>
    </div>
  );
}
