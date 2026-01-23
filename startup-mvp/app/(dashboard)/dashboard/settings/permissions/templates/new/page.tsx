import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import TemplateForm from "@/components/permissions/template-form";

export default async function NewTemplatePage() {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    redirect("/login");
  }

  // Check if user is admin
  const userRole = session.user.role?.toLowerCase();
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Permission Template</h1>
        <p className="text-sm text-muted-foreground">
          Create a new designation template for user permissions
        </p>
      </div>

      <TemplateForm mode="create" />
    </div>
  );
}
