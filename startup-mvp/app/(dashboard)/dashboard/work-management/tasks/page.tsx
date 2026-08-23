import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TaskCenterView from "./_components/TaskCenterView";
import { getCentralTaskCenterData } from "@/app/actions/projects/work-management-tasks.action";

export const metadata = {
  title: "Task Center | TS-CRM",
  description: "Centralized project task allocations, priorities, status tracking, and dependency management.",
};

export default async function TaskCenterPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Pre-load initial Task Center context
  const initialContext = await getCentralTaskCenterData();

  return (
    <TaskCenterView
      initialData={initialContext.success ? initialContext : null}
      currentUser={session.user}
    />
  );
}
