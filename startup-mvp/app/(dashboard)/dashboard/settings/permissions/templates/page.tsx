import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPermissionTemplates } from "@/app/actions/permission.action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import PermissionTemplatesList from "@/components/permissions/templates-list";

export default async function PermissionTemplatesPage() {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    redirect("/login");
  }

  // Check if user is admin
  const userRole = session.user.role?.toLowerCase();
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  const result = await getPermissionTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Permission Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage designation templates for user permissions
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/settings/permissions/templates/new">
            <FiPlus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      {!result.success ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load templates"}
          </p>
        </div>
      ) : (
        <PermissionTemplatesList
          initialTemplates={result.templates.map((t) => ({
            ...t,
            description: t.description || undefined,
          }))}
        />
      )}
    </div>
  );
}
