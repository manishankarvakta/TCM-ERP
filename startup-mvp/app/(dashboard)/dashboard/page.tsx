import { auth } from "@/lib/auth";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { Card, CardContent } from "@/components/ui/card";

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
  const userRole = session.user.role?.toLowerCase();

  // If user is admin or super-admin, show the Admin Dashboard
  if (userRole === "admin" || userRole === "super-admin") {
    return <AdminDashboard userId={userId} />;
  }

  // Otherwise, render the operational User Dashboard
  return <UserDashboard userId={userId} />;
}
