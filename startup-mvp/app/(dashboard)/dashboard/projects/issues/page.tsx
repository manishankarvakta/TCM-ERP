import PageGuard from "@/components/permissions/page-guard";
import { getAllIssues } from "@/app/actions/projects/project.action";
import IssuesKanban from "./_components/IssuesKanban";

export default async function IssuesPage() {
  const result = await getAllIssues("all");
  const issues = result.success ? (result.issues || []) : [];

  return (
    <PageGuard permissionKey="projects.issues">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Global Issues Board
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            Centralized task tracking and status matrix. Drag and drop cards to change status.
          </p>
        </div>

        <IssuesKanban initialIssues={issues as any[]} />
      </div>
    </PageGuard>
  );
}
