import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectById, getProjects } from "@/app/actions/projects/project.action";
import { getTasks } from "@/app/actions/system/task.action";
import { getNotes } from "@/app/actions/system/note.action";
import { getDocs } from "@/app/actions/system/doc.action";
import { getSystemTimeline } from "@/app/actions/system/timeline";
import { getSystemEvents } from "@/app/actions/system/events";
import { getActiveUsers } from "@/app/actions/user.action";
import { getUserPermissions } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import ProjectWorkspace from "./_components/ProjectWorkspace";
import { ProjectSwitcher } from "./_components/ProjectSwitcher";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
  "PLANNING": { label: "Planning", variant: "secondary" },
  "ACTIVE": { label: "Active", variant: "success" },
  "ON_HOLD": { label: "On Hold", variant: "outline" },
  "COMPLETED": { label: "Completed", variant: "default" },
  "CANCELLED": { label: "Cancelled", variant: "destructive" },
};

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await auth();

  if (!session?.user) return redirect("/login");

  const [
    permissionsResult,
    projectResult,
    taskResult,
    noteResult,
    docResult,
    eventResult,
    timelineResult,
    userResult,
    allProjectsResult
  ] = await Promise.all([
    getUserPermissions(session.user.id),
    getProjectById(id),
    getTasks(id, "project", 20),
    getNotes(id, "project", 20),
    getDocs(id, "project", 20),
    getSystemEvents("project", id, 20),
    getSystemTimeline("project", id, 50),
    getActiveUsers(),
    getProjects(1, 100)
  ]);

  if (!projectResult.success || !projectResult.project) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {projectResult.error || "Project not found"}
        </div>
      </div>
    );
  }

  const project = projectResult.project as any;
  const tasks = taskResult.success ? taskResult.tasks : [];
  const notes = noteResult.success ? noteResult.notes : [];
  const docs = docResult.success ? docResult.docs : [];
  const events = eventResult.events || [];
  const users = userResult.success ? userResult.users : [];
  const timelineResultData = timelineResult as any;
  const timelineEvents = (timelineResultData?.events || []) as any[];
  const allProjects = allProjectsResult.success ? allProjectsResult.projects : [];

  // Sort timeline events
  const allActivities = [...timelineEvents].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <PageGuard permissionKey="projects.projects">
      <div className="space-y-6 max-w-full mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link href="/dashboard/projects/all">
                    <ArrowLeftIcon className="h-4 w-4" />
                </Link>
            </Button>
            <div className="min-w-0">
               <div className="flex items-center gap-4 flex-wrap mb-1">
                <ProjectSwitcher 
                  currentProjectId={id} 
                  projects={allProjects} 
                  currentProjectTitle={project.title} 
                  currentProjectStatus={project.status} 
                />
                <Badge variant={statusMap[project.status]?.variant || ("default" as any)} className="uppercase text-[10px] tracking-wider font-bold h-fit py-1">
                    {statusMap[project.status]?.label || project.status}
                </Badge>
               </div>
               <p className="text-muted-foreground text-xs sm:text-sm font-medium truncate pl-12 mt-1">
                 {project.Client?.name || "Internal"} • Created on {project.createdAt ? format(new Date(project.createdAt), "PPP") : "-"}
               </p>
            </div>
          </div>
        </div>

        {/* Workspace handles Tabs and Sidebar */}
        <ProjectWorkspace 
            id={id} 
            permissions={permissionsResult}
            userRole={session.user.role || ""}
            userId={session.user.id}
            initialData={{ 
                project, 
                tasks, 
                notes, 
                docs, 
                events, 
                allActivities, 
                users 
            }} 
        />
      </div>
    </PageGuard>
  );
}
