import React from "react";
import ClientForm from "../_components/clientForm";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AddClientPage() {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canCreate = await checkPermission(session.user.id, "peoples.clients", "create");
  if (!canCreate) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          You do not have permission to create Clients.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientForm mode="create" />
    </div>
  );
}

