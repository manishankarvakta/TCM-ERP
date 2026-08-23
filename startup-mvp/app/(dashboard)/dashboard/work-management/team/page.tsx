import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyTeamView from "./_components/MyTeamView";
import { getTeamMembersWorkSummary } from "@/app/actions/projects/work-management-team.action";

export const metadata = {
  title: "My Team operational directory | TS-CRM",
  description: "Realtime employee live statuses, project workloads, and daily completed tasks tracking.",
};

export default async function MyTeamPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role?.toLowerCase();
  if (role !== "admin" && role !== "manager") {
    redirect("/dashboard");
  }

  // Pre-load team data server-side
  const result = await getTeamMembersWorkSummary();

  return (
    <MyTeamView
      initialTeam={result.success ? result.team : []}
    />
  );
}
