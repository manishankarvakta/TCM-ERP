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
import CompanyTodayView from "@/components/dashboard/company-today-view";

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
    <CompanyTodayView
      stats={statsResult.success ? statsResult.stats : null}
      recentQuotations={recentQuotationsResult.success ? recentQuotationsResult.quotations : []}
      statusBreakdown={statusBreakdownResult.success ? statusBreakdownResult.breakdown : null}
      recentItems={recentItemsResult.success ? recentItemsResult.items : []}
      activities={activityResult.success ? activityResult.activities : []}
      trends={trendsResult.success ? trendsResult.trends : []}
      userRole={session.user.role}
      userName={session.user.name || "Manager"}
    />
  );
}
