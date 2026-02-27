"use client";

import { useEffect, useState, useTransition } from "react";
import { getAdminCrmMetrics } from "@/app/actions/crm/crm-dashboard.action";
import { FiTrendingUp, FiTarget, FiDollarSign, FiUsers, FiActivity, FiPieChart, FiBarChart2, FiArrowUpRight, FiArrowDownRight } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

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
  const totalClosed = metrics.wonCount + metrics.lostCount;
  const winRate = totalClosed > 0 ? Math.round((metrics.wonCount / totalClosed) * 100) : 0;
  
  // Custom Funnel Data
  const funnelData = [
    { name: 'Discovery', value: metrics.funnel.DISCOVERY || 0, color: '#06b6d4' },
    { name: 'Qualified', value: metrics.funnel.QUALIFIED || 0, color: '#8b5cf6' },
    { name: 'Proposal', value: metrics.funnel.PROPOSAL || 0, color: '#3b82f6' },
    { name: 'Negotiation', value: metrics.funnel.NEGOTIATION || 0, color: '#f59e0b' },
    { name: 'Won', value: metrics.wonCount, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pipeline */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all hover:shadow-md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight flex items-center gap-2 uppercase">
                    <FiDollarSign className="w-4 h-4" /> Active Pipeline
                  </h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
                    {metrics.pipelineCount} Deals
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCurrency(metrics.pipelineValue)}
                    </h2>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-slate-400">
                   <FiActivity className="mr-1 text-blue-500" /> Current open opportunities
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* Total Won */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all hover:shadow-md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight flex items-center gap-2 uppercase">
                    <FiTrendingUp className="w-4 h-4" /> Revenue Won
                  </h3>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
                    {winRate}% Win Rate
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(metrics.wonValue)}
                    </h2>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-emerald-500">
                   <FiArrowUpRight className="mr-1" /> Total success cases
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* Lost Pipeline */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all hover:shadow-md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight flex items-center gap-2 uppercase">
                    <FiArrowDownRight className="w-4 h-4" /> Revenue Lost
                  </h3>
                  <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {metrics.lostCount} Deals
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter text-red-500">
                        {formatCurrency(metrics.lostValue)}
                    </h2>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-red-400">
                   <FiActivity className="mr-1" /> Opportunities moved to lost
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-orange-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>

        {/* New Leads */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl relative group transition-all hover:shadow-md">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 tracking-tight flex items-center gap-2 uppercase">
                    <FiUsers className="w-4 h-4" /> Monthly Leads
                  </h3>
                  <Badge variant="outline" className="bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400">
                    New Intake
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {metrics.newLeadsMonth}
                    </h2>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-violet-500">
                   <FiBarChart2 className="mr-1" /> Total leads this month
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 to-purple-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiTrendingUp className="text-primary" /> Revenue Trend (Last 6 Months)
            </h3>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.revenueByMonth}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(value) => formatCompactCurrency(value)}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiPieChart className="text-primary" /> Lead Sources
            </h3>
          </div>
          <div className="flex-1 w-full flex flex-col sm:flex-row items-center">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.leadSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics.leadSources.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-48 space-y-3 mt-4 sm:mt-0 px-4">
              {metrics.leadSources.slice(0, 4).map((source: any, index: number) => (
                <div key={source.name} className="flex flex-col">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">{source.name}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{source.value}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${(source.value / Math.max(metrics.leadSources.reduce((acc: any, curr: any) => acc + curr.value, 0), 1)) * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel Bars */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full min-h-[400px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <FiBarChart2 className="text-primary" /> Sales Pipeline Funnel
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-6">
            {funnelData.map((stage, index) => {
              const maxValue = Math.max(...funnelData.map(d => d.value), 1);
              const width = Math.max((stage.value / maxValue) * 100, 2);
              
              return (
                <div key={stage.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{stage.name}</span>
                    <span className="font-black text-slate-900 dark:text-white">{stage.value} Deals</span>
                  </div>
                  <div className="relative h-10 w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg overflow-hidden group">
                    <div 
                      className="h-full transition-all duration-700 ease-out relative"
                      style={{ 
                        width: `${width}%`, 
                        backgroundColor: stage.color,
                        opacity: 0.8 + (index * 0.05)
                      }}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Leads Timeline */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
            <Link href="/dashboard/crm/leads" className="text-sm font-semibold text-primary hover:underline">
                View All
            </Link>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {metrics.recentLeads.length > 0 ? (
                metrics.recentLeads.map((lead: any, idx: number) => (
                    <div key={lead.id} className="relative pl-8 pb-6 last:pb-0">
                        {/* Timeline Connector */}
                        {idx !== metrics.recentLeads.length - 1 && (
                          <div className="absolute left-[15px] top-[30px] bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
                        )}
                        {/* Timeline Icon */}
                        <div className="absolute left-0 top-0 h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-50 dark:bg-slate-800 flex items-center justify-center z-10 shadow-sm">
                          <FiUsers className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        
                        <Link href={`/dashboard/crm/leads/${lead.id}`} className="block">
                          <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{lead.name}</p>
                                <span className="text-[10px] text-slate-400 font-medium">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
                              </div>
                              <p className="text-xs font-medium text-slate-500 mt-0.5">{lead.company || "Individual Lead"}</p>
                              <div className="mt-2 text-right">
                                <Badge variant="secondary" className="text-[9px] h-4 py-0 font-bold uppercase tracking-wider text-slate-600">
                                  {lead.status}
                                </Badge>
                              </div>
                          </div>
                        </Link>
                    </div>
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <FiUsers className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-500">No recent activity.</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
