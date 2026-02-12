import ActivityManager from "./_components/ActivityManager";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function ActivitiesPage() {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "crm.activities", "view");
  if (!canView) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          You do not have permission to view Activities.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <ActivityManager />
    </div>
  );
}
