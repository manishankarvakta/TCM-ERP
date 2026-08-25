import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDashboardStats,
  getRecentQuotations,
  getQuotationStatusBreakdown,
  getRecentItems,
  getSystemActivity,
  getDashboardTrends,
} from "@/app/actions/dashboard.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FiPlus, FiFileText, FiPackage, FiUsers, FiShoppingCart } from "react-icons/fi";
import AdminDashboardStats from "@/components/dashboard/admin-dashboard-stats";
import RecentQuotationsTable from "@/components/dashboard/recent-quotations-table";
import QuotationStatusChart from "@/components/dashboard/quotation-status-chart";
import RecentActivity from "@/components/dashboard/recent-activity";
import SalesTrendChart from "@/components/dashboard/sales-trend-chart";

export default async function AdminDashboardPage() {
  const session = await auth();

  // Check if user has valid session
  if (!session?.user?.id || !session?.user?.email) {
    redirect("/login");
  }

  // Check if user is admin
  const userRole = session.user.role?.toLowerCase();
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all dashboard data in parallel (including monthly trends)
  const [
    statsResult,
    recentQuotationsResult,
    statusBreakdownResult,
    recentItemsResult,
    activityResult,
    trendsResult,
  ] = await Promise.all([
    getDashboardStats(),
    getRecentQuotations(10),
    getQuotationStatusBreakdown(),
    getRecentItems(5),
    getSystemActivity(10),
    getDashboardTrends(6),
  ]);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your system data, statistics, and monthly performance trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/dashboard/quotations/new">
              <FiPlus className="mr-2 h-4 w-4" />
              New Quotation
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <AdminDashboardStats stats={statsResult.success ? statsResult.stats : null} />

      {/* Row 2: Sales Trend and Quotation Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <SalesTrendChart trends={trendsResult.success ? trendsResult.trends : []} />

        {statusBreakdownResult.success ? (
          <QuotationStatusChart breakdown={statusBreakdownResult.breakdown} />
        ) : (
          <Card className="col-span-full lg:col-span-2 shadow-sm border border-border/50 h-[400px]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quotation Status</CardTitle>
              <CardDescription className="text-sm">Distribution of quotations by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] flex items-center justify-center text-sm text-destructive">
                {statusBreakdownResult.error || "Failed to load status breakdown"}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 3: Recent Quotations and Recent Items */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4 shadow-sm border border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Quotations</CardTitle>
                <CardDescription className="text-sm">Latest quotations in your system</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/quotations">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentQuotationsResult.success ? (
              <RecentQuotationsTable quotations={recentQuotationsResult.quotations} />
            ) : (
              <div className="rounded-lg border p-8 text-center">
                <p className="text-sm text-destructive">
                  {recentQuotationsResult.error || "Failed to load recent quotations"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3 shadow-sm border border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Items</CardTitle>
                <CardDescription className="text-sm">Latest items added to catalog</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/items">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentItemsResult.success && recentItemsResult.items.length > 0 ? (
              <div className="h-[400px] overflow-y-auto space-y-3 pr-2">
                {recentItemsResult.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.code}</span>
                        {item.categories.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({item.categories[0].category.name})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium">
                        {new Intl.NumberFormat('en-BD', {
                          style: 'currency',
                          currency: 'BDT',
                        }).format(item.unitPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.unit?.symbol || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentItemsResult.success ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="rounded-lg border p-8 text-center border-dashed">
                  <p className="text-sm text-muted-foreground">No items found</p>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <div className="rounded-lg border p-8 text-center">
                  <p className="text-sm text-destructive">
                    {recentItemsResult.error || "Failed to load recent items"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recent Activity and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4 shadow-sm border border-border/50">
          {activityResult.success ? (
            <RecentActivity activities={activityResult.activities} />
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <CardDescription className="text-sm">System activity and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-sm text-destructive">
                  {activityResult.error || "Failed to load recent activity"}
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <Card className="col-span-full lg:col-span-3 shadow-sm border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">Quick links to create new entities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-2">
              <Link 
                href="/dashboard/quotations/new" 
                className="group flex flex-col p-3.5 rounded-xl border border-border/60 hover:border-indigo-500/40 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all duration-300 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 group-hover:scale-105 transition-transform duration-300">
                    <FiFileText className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                    &rarr;
                  </span>
                </div>
                <span className="font-semibold text-xs text-foreground mb-0.5">New Quotation</span>
                <span className="text-[10px] text-muted-foreground leading-normal line-clamp-1">
                  Create client quotation
                </span>
              </Link>

              <Link 
                href="/dashboard/items/add" 
                className="group flex flex-col p-3.5 rounded-xl border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 transition-all duration-300 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 group-hover:scale-105 transition-transform duration-300">
                    <FiPackage className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                    &rarr;
                  </span>
                </div>
                <span className="font-semibold text-xs text-foreground mb-0.5">Add Item</span>
                <span className="text-[10px] text-muted-foreground leading-normal line-clamp-1">
                  Add catalog item
                </span>
              </Link>

              <Link 
                href="/dashboard/clients/add" 
                className="group flex flex-col p-3.5 rounded-xl border border-border/60 hover:border-blue-500/40 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 transition-all duration-300 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 group-hover:scale-105 transition-transform duration-300">
                    <FiUsers className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                    &rarr;
                  </span>
                </div>
                <span className="font-semibold text-xs text-foreground mb-0.5">Add Client</span>
                <span className="text-[10px] text-muted-foreground leading-normal line-clamp-1">
                  Add new system client
                </span>
              </Link>

              <Link 
                href="/dashboard/suppliers/add" 
                className="group flex flex-col p-3.5 rounded-xl border border-border/60 hover:border-purple-500/40 hover:bg-purple-50/10 dark:hover:bg-purple-950/10 transition-all duration-300 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-500 group-hover:scale-105 transition-transform duration-300">
                    <FiShoppingCart className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                    &rarr;
                  </span>
                </div>
                <span className="font-semibold text-xs text-foreground mb-0.5">Add Supplier</span>
                <span className="text-[10px] text-muted-foreground leading-normal line-clamp-1">
                  Add new supplier
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

