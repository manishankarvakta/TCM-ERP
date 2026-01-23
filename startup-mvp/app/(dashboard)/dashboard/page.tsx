import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UserDashboardStats from "@/components/dashboard/user-dashboard-stats";
import RecentActivity from "@/components/dashboard/recent-activity";
import {
  getUserDashboardStats,
  getUserActivity,
} from "@/app/actions/dashboard.action";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import { FiPackage, FiUsers } from "react-icons/fi";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex-1 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Please log in to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userId = session.user.id;

  // Fetch all data in parallel
  const [
    statsResult,
    activityResult,
  ] = await Promise.all([
    getUserDashboardStats(),
    getUserActivity(10),
  ]);

  const stats = statsResult.success ? statsResult.stats : null;
  // const quotations = quotationsResult.success ? quotationsResult.quotations : [];
  // const items = itemsResult.success ? itemsResult.items : [];
  // const activities = activityResult.success ? activityResult.activities : [];
  // const statusBreakdown = statusBreakdownResult.success
  //   ? statusBreakdownResult.breakdown
  //   : [];

  // Check permissions for quick actions
  const canCreateItem = await hasPermission(userId, "items.items", "create");
  const canCreateClient = await hasPermission(
    userId,
    "peoples.clients",
    "create"
  );

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your business data and statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Statistics Cards */}
      {/* <UserDashboardStats stats={stats} /> */}

      {/* Recent Quotations and Status Breakdown */}
      {/* {stats?.permissions.canAccessQuotations && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
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
              {quotations.length > 0 ? (
                <RecentQuotationsTable quotations={quotations} />
              ) : (
                <div className="rounded-lg border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No quotations found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {statusBreakdown.length > 0 && (
            <Card className="col-span-3">
              <QuotationStatusChart breakdown={statusBreakdown} />
            </Card>
          )}
        </div>
      )} */}

      {/* Recent Items and Activity */}
      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {stats?.permissions.canAccessItems && items.length > 0 && (
          <Card className="col-span-3">
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
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
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
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(item.unitPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.unit?.symbol || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={stats?.permissions.canAccessItems && items.length > 0 ? "col-span-4" : "col-span-full"}>
          {activities.length > 0 ? (
            <RecentActivity activities={activities} />
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <CardDescription className="text-sm">System activity and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No recent activity
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div> */}

      {/* Quick Actions */}
      {(canCreateItem || canCreateClient) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Quick links to create new entities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {canCreateItem && (
                <Button variant="outline" className="h-auto py-4 flex flex-col items-start" asChild>
                  <Link href="/dashboard/items/add">
                    <div className="flex items-center gap-2 mb-2">
                      <FiPackage className="h-5 w-5" />
                      <span className="font-semibold">Add Item</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      Add a new item to the catalog
                    </span>
                  </Link>
                </Button>
              )}

              {canCreateClient && (
                <Button variant="outline" className="h-auto py-4 flex flex-col items-start" asChild>
                  <Link href="/dashboard/clients/add">
                    <div className="flex items-center gap-2 mb-2">
                      <FiUsers className="h-5 w-5" />
                      <span className="font-semibold">Add Client</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      Add a new client to the system
                    </span>
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
