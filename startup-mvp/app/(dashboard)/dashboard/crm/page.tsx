import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AdminDashboardTabs } from "./_components/AdminDashboardTabs";
import { UserDashboard } from "./_components/UserDashboard";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "CRM Dashboard | Ts-CRM",
  description: "View and manage your CRM activities and pipeline.",
};

export default async function CrmDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check if they have general CRM view access
  const canViewCrm = await checkPermission(session.user.id, "crm", "view");

  if (!canViewCrm) {
    redirect("/dashboard");
  }

  // Determine if they should see the Admin dashboard
  // Typically an "Admin" has manage permissions across CRM, or a specific admin role
  const isAdmin = await checkPermission(session.user.id, "crm", "manage") || session.user.role?.toLowerCase() === 'admin' || session.user.role?.toLowerCase() === 'superadmin';

  if (isAdmin) {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
    return <AdminDashboardTabs users={users} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
        <p className="text-muted-foreground">
           Your personal sales pipeline, actionable tasks, and upcoming events.
        </p>
      </div>

      <UserDashboard />
    </div>
  );
}
