import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SettingsLayoutWrapper from "@/components/settings/settings-layout-wrapper";

export default async function PermissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    redirect("/login");
  }

  // Check if user is admin
  const userRole = session.user.role?.toLowerCase();
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <SettingsLayoutWrapper activeSection="permissions">{children}</SettingsLayoutWrapper>;
}
