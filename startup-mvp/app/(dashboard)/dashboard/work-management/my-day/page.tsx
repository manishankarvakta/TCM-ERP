import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyDayView from "./_components/MyDayView";
import { getMyDayData } from "@/app/actions/projects/work-management-myday.action";

export const metadata = {
  title: "My Day | TS-CRM",
  description: "Personal daily workspace to plan today's priorities, select focus tasks, and track session times.",
};

export default async function MyDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { date } = await searchParams;

  // Pre-load My Day context for the logged-in employee
  const initialContext = await getMyDayData(date);

  return (
    <MyDayView
      initialData={initialContext.success ? initialContext : null}
      currentUser={session.user}
    />
  );
}
