import React from "react";
import { getResignationById } from "../_actions/resignation.action";
import ResignationDetailsClient from "./_components/resignation-details-client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";

interface ResignationDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResignationDetailsPage({ params }: ResignationDetailsPageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit, canApprove] = await Promise.all([
    getResignationById(id),
    userId ? hasPermission(userId, "hr.resignation", "view") : false,
    userId ? hasPermission(userId, "hr.resignation", "edit") : false,
    userId ? hasPermission(userId, "hr.resignation", "approve") : false,
  ]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Permission denied. You cannot view this resignation details page.</p>
        </div>
      </div>
    );
  }

  if (!result.success || !result.resignation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resignation Review</h1>
          <p className="text-sm text-muted-foreground">Detailed view for resignation approval and offboarding logs</p>
        </div>
      </div>

      <ResignationDetailsClient
        resignation={result.resignation}
        permissions={{
          edit: canEdit,
          approve: canApprove
        }}
      />
    </div>
  );
}
