import React from "react";
import { getClientById } from "../_actions/client.action";
import ClientForm from "../_components/clientForm";
import { notFound } from "next/navigation";

interface EditClientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
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

