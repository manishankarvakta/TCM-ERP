import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPermissionTemplateById } from "@/app/actions/permission.action";
import TemplateForm from "@/components/permissions/template-form";

interface EditTemplatePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
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

  const result = await getPermissionTemplateById(id);

  if (!result.success || !result.template) {
    redirect("/dashboard/settings/permissions/templates");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Permission Template</h1>
        <p className="text-sm text-muted-foreground">
          Edit the "{result.template.name}" template
        </p>
      </div>

      <TemplateForm template={result.template as any} mode="edit" />
    </div>
  );
}
