import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDashboardStats,
  getSystemActivity,
} from "@/app/actions/dashboard.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FiPackage, FiUsers, FiShoppingCart } from "react-icons/fi";
import AdminDashboardStats from "@/components/admin/admin-dashboard-stats";
import RecentActivity from "@/components/admin/recent-activity";

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

  // Fetch all dashboard data in parallel
  const [
    statsResult,
    activityResult,
  ] = await Promise.all([
    getDashboardStats(),
    getSystemActivity(10),
  ]);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your system data and statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Statistics Cards */}
      <AdminDashboardStats stats={statsResult.success ? statsResult.stats : null} />

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
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
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          <CardDescription className="text-sm">Quick links to create new entities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start" asChild>
              <Link href="/admin/items/add">
                <div className="flex items-center gap-2 mb-2">
                  <FiPackage className="h-5 w-5" />
                  <span className="font-semibold">Add Item</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Add a new item to the catalog
                </span>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 flex flex-col items-start" asChild>
              <Link href="/admin/clients/add">
                <div className="flex items-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5" />
                  <span className="font-semibold">Add Client</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Add a new client to the system
                </span>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 flex flex-col items-start" asChild>
              <Link href="/admin/suppliers/add">
                <div className="flex items-center gap-2 mb-2">
                  <FiShoppingCart className="h-5 w-5" />
                  <span className="font-semibold">Add Supplier</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Add a new supplier to the system
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
