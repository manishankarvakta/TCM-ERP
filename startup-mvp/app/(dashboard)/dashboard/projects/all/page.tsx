import PageGuard from "@/components/permissions/page-guard";
import ProjectManagerAll from "./_components/ProjectManagerAll";
import { getProjects } from "@/app/actions/projects/project.action";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";

interface ProjectsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    priority?: string;
  }>;
}

export default async function AllProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "all";
  const priority = params.priority || "all";

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const [projectsResult, canCreate] = await Promise.all([
    getProjects(page, 10, search, status, undefined, undefined, undefined, undefined, priority),
    hasPermission(userId, "projects.projects", "create"),
  ]);

  const totalProjects = projectsResult.pagination?.total || 0;

  return (
    <PageGuard permissionKey="projects.all">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
                Project Lists
                <span className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 font-black px-3.5 py-1 rounded-full text-sm border border-emerald-500/20">
                    {totalProjects} Projects
                </span>
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
                Manage and track all workforce projects in a single operational repository.
            </p>
        </div>
        
        <ProjectManagerAll 
          initialProjects={projectsResult.projects || []}
          initialPagination={projectsResult.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
          canCreate={canCreate}
        />
      </div>
    </PageGuard>
  );
}
