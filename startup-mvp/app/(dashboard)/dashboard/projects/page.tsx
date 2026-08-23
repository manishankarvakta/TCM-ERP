import PageGuard from "@/components/permissions/page-guard";
import OperationsCenter from "./_components/OperationsCenter";
import EnterpriseDashboard from "./_components/EnterpriseDashboard";
import { auth } from "@/lib/auth";
import { getWorkManagementDashboardData } from "@/app/actions/projects/work-management-dashboard.action";
import WorkManagementDashboard from "../work-management/_components/WorkManagementDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Clock } from "lucide-react";

export const metadata = {
  title: "Project Control Center | TS-CRM",
  description: "Manage project lifecycle, milestones, issues, and team live work sessions.",
};

export default async function AdminProjectsPage() {
  const session = await auth();
  
  // Pre-load work management dashboard telemetry
  const initialWorkData = await getWorkManagementDashboardData();
  
  const userRole = session?.user?.role?.toLowerCase();
  const showWorkManagement = userRole === "admin" || userRole === "manager";

  return (
    <PageGuard permissionKey="projects.projects">
      <div className="max-w-[1600px] mx-auto space-y-5 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-border/40 pb-3">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Project Dashboard
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Manage your project lifecycle, milestones, issues, and realtime team activity across the ecosystem.
          </p>
        </div>

        {showWorkManagement ? (
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg text-xs font-bold gap-2">
                <Briefcase className="h-3.5 w-3.5" /> Overview & Telemetry
              </TabsTrigger>
              <TabsTrigger value="work-management" className="rounded-lg text-xs font-bold gap-2">
                <Clock className="h-3.5 w-3.5" /> Work Management
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview & Telemetry */}
            <TabsContent value="overview" className="space-y-6 outline-none">
              <EnterpriseDashboard />
              <OperationsCenter />
            </TabsContent>

            {/* Tab 2: Work Management Command Center */}
            <TabsContent value="work-management" className="outline-none">
              <WorkManagementDashboard
                initialData={initialWorkData.success ? initialWorkData : null}
                currentUser={session?.user}
                hideHeader={true}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <EnterpriseDashboard />
            <OperationsCenter />
          </div>
        )}
      </div>
    </PageGuard>
  );
}
