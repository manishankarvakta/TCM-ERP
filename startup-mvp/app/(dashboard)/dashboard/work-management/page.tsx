import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WorkManagementDashboard from "./_components/WorkManagementDashboard";
import { getWorkManagementDashboardData } from "@/app/actions/projects/work-management-dashboard.action";

export const metadata = {
  title: "Work Management Command Center | TS-CRM",
  description: "Realtime team live status, daily updates, and project progress monitoring dashboard.",
};

export default async function WorkManagementPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role?.toLowerCase();
  if (role !== "admin" && role !== "manager") {
    redirect("/dashboard");
  }

  // Initial SSR fetch of aggregated data
  const initialData = await getWorkManagementDashboardData();

  return (
    <WorkManagementDashboard
      initialData={initialData.success ? initialData : null}
      currentUser={session.user}
    />
  );
}
