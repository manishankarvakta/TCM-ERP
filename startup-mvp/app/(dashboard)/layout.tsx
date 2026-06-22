import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardSidebarWrapper from "@/components/dashboard/sidebar-wrapper";
import DashboardHeader from "@/components/dashboard/header";

export const dynamic = 'force-dynamic';

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

  return (
    <div className="flex h-screen overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          height: 100vh !important;
        }
      `}} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
