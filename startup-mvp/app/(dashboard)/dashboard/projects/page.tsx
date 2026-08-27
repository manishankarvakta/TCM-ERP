import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { getWorkManagementDashboardData } from "@/app/actions/projects/work-management-dashboard.action";
import WorkManagementDashboard from "../work-management/_components/WorkManagementDashboard";

export const metadata = {
  title: "Project Control Center | TS-CRM",
  description: "Manage realtime team activity and work sessions across the ecosystem.",
};

export default async function AdminProjectsPage() {
  const session = await auth();
  
  // Pre-load work management dashboard telemetry
  const initialWorkData = await getWorkManagementDashboardData();
  
  return (
    <PageGuard permissionKey="projects.projects">
      <div className="max-w-[1600px] mx-auto space-y-5 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-border/40 pb-3">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Project Dashboard
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Manage your realtime team activity and work sessions across the ecosystem.
          </p>
        </div>

        <WorkManagementDashboard
          initialData={initialWorkData.success ? initialWorkData : null}
          currentUser={session?.user}
          hideHeader={true}
        />
      </div>
    </PageGuard>
  );
}
