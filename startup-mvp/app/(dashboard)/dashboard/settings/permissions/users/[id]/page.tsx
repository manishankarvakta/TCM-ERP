import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserPermissionsAction, getPermissionTemplates } from "@/app/actions/permission.action";
import { getUserById } from "@/app/actions/user.action";
import UserPermissionsForm from "@/components/permissions/user-permissions-form";

interface UserPermissionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserPermissionsPage({
  params,
}: UserPermissionsPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id || !session?.user?.email) {
    redirect("/login");
  }

  // Check if user is admin
  const userRole = session.user.role?.toLowerCase();
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  // Get user data
  const userResult = await getUserById(id);
  if (!userResult.success || !userResult.user) {
    redirect("/dashboard/users");
  }

  // Get user permissions
  const permissionsResult = await getUserPermissionsAction(id);

  // Get all templates
  const templatesResult = await getPermissionTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {userResult.user.name || userResult.user.email}
        </p>
      </div>

      {!permissionsResult.success ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {permissionsResult.error || "Failed to load permissions"}
          </p>
        </div>
      ) : (
        <UserPermissionsForm
          userId={id}
          initialPermissions={permissionsResult.permissions}
          initialTemplateId={permissionsResult.template?.id || null}
          templates={
            templatesResult.success
              ? templatesResult.templates.map((t) => ({
                  ...t,
                  description: t.description ?? undefined,
                }))
              : []
          }
        />
      )}
    </div>
  );
}
