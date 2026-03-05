import PageGuard from "@/components/permissions/page-guard";
import ProjectManagerAll from "./_components/ProjectManagerAll";
import { getProjects } from "@/app/actions/projects/project.action";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface ProjectsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function AllProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "all";

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const [projectsResult, canCreate] = await Promise.all([
    getProjects(page, 10, search, status),
    hasPermission(userId, "projects.projects", "create"),
  ]);

  return (
    <PageGuard permissionKey="projects.all">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                All Projects
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
                Manage and track all your projects in one place.
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
