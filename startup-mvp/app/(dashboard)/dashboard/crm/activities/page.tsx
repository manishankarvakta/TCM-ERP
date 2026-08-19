import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivities } from "@/app/actions/crm/activity.action";
import ActivityManager from "./_components/ActivityManager";

export default async function AdminActivitiesPage() {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const result = await getActivities(1, 100);
  const activities = result.success ? result.activities : [];

  return (
    <PageGuard permissionKey="crm.activities">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">CRM Activities</h1>
            <p className="text-muted-foreground">Monitor Tasks, Notes, and Events across all CRM modules.</p>
        </div>
        
        <ActivityManager activities={activities} />
      </div>
    </PageGuard>
  );
}
