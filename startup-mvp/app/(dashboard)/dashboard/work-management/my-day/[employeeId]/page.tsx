import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeeMyDayView from "../_components/EmployeeMyDayView";
import { getEmployeeMyDayData } from "@/app/actions/projects/work-management-myday.action";

export const metadata = {
  title: "Employee Daily Plan | TS-CRM",
  description: "Manager read-only workspace to monitor employee priorities, today's focus task, and work sessions.",
};

interface Props {
  params: Promise<{
    employeeId: string;
  }>;
}

export default async function EmployeeMyDayPage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Only managers/admins can view other employees' My Day
  const role = session.user.role?.toLowerCase();
  if (role !== "admin" && role !== "manager") {
    redirect("/dashboard");
  }

  const { employeeId } = await params;

  // Pre-load targeted employee's daily planning details
  const initialContext = await getEmployeeMyDayData(employeeId);

  if (!initialContext.success) {
    redirect("/dashboard/work-management/team");
  }

  return (
    <EmployeeMyDayView
      initialData={initialContext}
      employeeId={employeeId}
    />
  );
}
