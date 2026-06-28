import React from "react";
import ResignationForm from "../_components/resignation-form";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function ApplyResignationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const canEdit = await hasPermission(session.user.id, "hr.resignation", "edit");
  const canCreate = await hasPermission(session.user.id, "hr.resignation", "create");
  if (!canEdit && !canCreate) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">You do not have permission to submit a resignation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResignationForm />
    </div>
  );
}
