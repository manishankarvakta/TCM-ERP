import React from "react";
import { getClientById } from "../../_actions/client.action";
import ClientForm from "../../_components/clientForm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

interface EditClientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canEdit = await checkPermission(session.user.id, "peoples.clients", "edit");
  if (!canEdit) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          You do not have permission to edit Clients.
        </div>
      </div>
    );
  }

  const { id } = await params;
  const result = await getClientById(id);

  if (!result.success || !result.client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ClientForm mode="edit" initialData={result.client} />
    </div>
  );
}
