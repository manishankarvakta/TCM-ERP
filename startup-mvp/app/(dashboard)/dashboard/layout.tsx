import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardSidebarWrapper from "@/components/dashboard/sidebar-wrapper";
import DashboardHeader from "@/components/dashboard/header";
import PermissionSync from "@/components/permissions/permission-sync";

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

  // Admin users can access both /admin and /dashboard routes
  // Regular users can only access /dashboard routes (enforced in proxy.ts)
  // No redirect needed here - allow all authenticated users to access dashboard

  // Only show permission sync for non-admin users
  const isAdmin = session.user.role?.toLowerCase() === "admin";

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="print:hidden flex h-full">
        <DashboardSidebarWrapper />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="print:hidden">
          <DashboardHeader user={session.user} />
        </div>
        <main className="flex-1 overflow-y-auto bg-background p-6 print:p-0">
          {children}
        </main>
      </div>
      <PermissionSync />
    </div>
  );
}
