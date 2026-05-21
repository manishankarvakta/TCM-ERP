import PageGuard from "@/components/permissions/page-guard";
import { getAllMilestones } from "@/app/actions/projects/project.action";
import MilestonesManager from "./_components/MilestonesManager";

export default async function MilestonesPage() {
  const result = await getAllMilestones("all");
  const milestones = result.success ? (result.milestones || []) : [];

  return (
    <PageGuard permissionKey="projects.milestones">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Global Milestones
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            Track and monitor critical phases and target delivery dates across all active projects.
          </p>
        </div>

        <MilestonesManager initialMilestones={milestones as any[]} />
      </div>
    </PageGuard>
  );
}
