import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageGuard from "@/components/permissions/page-guard";
import {
  FiPackage,
  FiFileText,
  FiBox,
  FiList,
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiBarChart,
} from "react-icons/fi";

export default function ReportsPage() {
  const reportCategories = [
    {
      title: "Inventory Reports",
      description: "Stock summaries, ledgers, and consumption reports",
      icon: FiPackage,
      reports: [
        {
          title: "Stock Summary",
          description: "Current stock levels by item and warehouse",
          href: "/dashboard/reports/inventory/stock-summary",
        },
        {
          title: "Stock Ledger",
          description: "Detailed stock movement transactions",
          href: "/dashboard/reports/inventory/stock-ledger",
        },
        {
          title: "Stock Movements",
          description: "Opening, inward, outward, and closing balances of a specific day",
          href: "/dashboard/reports/inventory/stock-movements",
        },
        {
          title: "Raw Material Consumption",
          description: "Raw material usage for production",
          href: "/dashboard/reports/inventory/raw-material-consumption",
        },
      ],
    },
    {
      title: "Production Reports",
      description: "Production orders and cost analysis",
      icon: FiList,
      reports: [
        {
          title: "Production Order Summary",
          description: "Overview of all production orders",
          href: "/dashboard/reports/production/production-order-summary",
        },
        {
          title: "Cost Per Batch",
          description: "Production cost analysis by batch",
          href: "/dashboard/reports/production/cost-per-batch",
        },
      ],
    },
    {
      title: "Sales Reports",
      description: "Revenue analysis and sales trends",
      icon: FiDollarSign,
      reports: [
        {
          title: "Revenue by Client",
          description: "Sales breakdown by client",
          href: "/dashboard/reports/sales/revenue-by-client",
        },
        {
          title: "Revenue by Item",
          description: "Sales breakdown by item with profit margins",
          href: "/dashboard/reports/sales/revenue-by-item",
        },
        {
          title: "Sales Trends",
          description: "Sales trends over time with charts",
          href: "/dashboard/reports/sales/sales-trends",
        },
      ],
    },
    {
      title: "Analytics",
      description: "Interactive analytics dashboard",
      icon: FiBarChart,
      reports: [
        {
          title: "Analytics Dashboard",
          description: "Comprehensive analytics with charts and visualizations",
          href: "/dashboard/reports/analytics",
        },
      ],
    },
    {
      title: "HR & Payroll Reports",
      description: "Attendance, salary sheets, and employee analytics",
      icon: FiUsers,
      reports: [
        {
          title: "Attendance Summary",
          description: "Daily and monthly attendance tracking",
          href: "/dashboard/reports/hr/attendance",
        },
        {
          title: "Payroll Summary",
          description: "Salary sheets and disbursement overview",
          href: "/dashboard/reports/hr/payroll",
        },
        {
          title: "Employee Joining Report",
          description: "Detailed list of new hires and staff movements",
          href: "/dashboard/reports/hr/employee-joining",
        },
        {
          title: "Leave Balance Report",
          description: "Current leave availability and usage history",
          href: "/dashboard/reports/hr/leave-balance",
        },
      ],
    },
  ];

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and view comprehensive business reports
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {reportCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.reports.map((report) => (
                      <Link key={report.href} href={report.href}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-3"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{report.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {report.description}
                            </div>
                          </div>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accounting Reports</CardTitle>
            <CardDescription>
              Financial reports including Trial Balance, Balance Sheet, and P&L
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/dashboard/accounts/trial-balance">
                <Button variant="outline" className="w-full justify-start">
                  <FiFileText className="h-4 w-4 mr-2" />
                  Trial Balance
                </Button>
              </Link>
              <Link href="/dashboard/accounts/balance-sheet">
                <Button variant="outline" className="w-full justify-start">
                  <FiFileText className="h-4 w-4 mr-2" />
                  Balance Sheet
                </Button>
              </Link>
              <Link href="/dashboard/accounts/profit-loss">
                <Button variant="outline" className="w-full justify-start">
                  <FiTrendingUp className="h-4 w-4 mr-2" />
                  Profit & Loss
                </Button>
              </Link>
              <Link href="/dashboard/accounts/accounts-receivable">
                <Button variant="outline" className="w-full justify-start">
                  <FiUsers className="h-4 w-4 mr-2" />
                  Accounts Receivable
                </Button>
              </Link>
              <Link href="/dashboard/accounts/accounts-payable">
                <Button variant="outline" className="w-full justify-start">
                  <FiUsers className="h-4 w-4 mr-2" />
                  Accounts Payable
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
