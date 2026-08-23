import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeeWorkProfileView from "../_components/EmployeeWorkProfileView";
import { getEmployeeWorkProfile } from "@/app/actions/projects/work-management-team.action";

export const metadata = {
  title: "Employee Work Profile | TS-CRM",
  description: "Detailed employee work progress, project task breakdowns, daily updates history, and timers.",
};

interface ProfilePageProps {
  params: Promise<{
    employeeId: string;
  }>;
}

export default async function EmployeeWorkProfilePage({ params }: ProfilePageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { employeeId } = await params;

  // Fetch the work profile
  const result = await getEmployeeWorkProfile(employeeId);

  if (!result.success || !result.profile) {
    redirect("/dashboard"); // Redirect unauthorized or not found
  }

  return (
    <EmployeeWorkProfileView
      profile={result.profile}
      currentUser={session.user}
    />
  );
}
