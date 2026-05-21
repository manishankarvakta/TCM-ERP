import PageGuard from "@/components/permissions/page-guard";
import ProjectManager from "./_components/ProjectManager";
import EnterpriseDashboard from "./_components/EnterpriseDashboard";

export default function AdminProjectsPage() {
  return (
    <PageGuard permissionKey="projects.projects">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-1 mb-10">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Project Dashboard
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
                Manage your project lifecycle and technical issues across the ecosystem.
            </p>
        </div>
        
        <EnterpriseDashboard />
        
        <ProjectManager />
      </div>
    </PageGuard>
  );
}
