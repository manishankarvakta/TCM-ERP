import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardSidebarWrapper from "@/components/dashboard/sidebar-wrapper";
import DashboardHeader from "@/components/dashboard/header";
import { getUserPermissionsEnhanced } from "@/lib/permissions";
import RouteGuard from "@/components/permissions/route-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user has valid session with user data
  // When force logged out, session exists but without user.id
  if (!session?.user?.id || !session?.user?.email) {
    redirect("/login");
  }

  const permissions = await getUserPermissionsEnhanced(session.user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebarWrapper />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={session.user} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <RouteGuard permissions={permissions} role={session.user.role}>
            {children}
          </RouteGuard>
        </main>
      </div>
    </div>
  );
}
