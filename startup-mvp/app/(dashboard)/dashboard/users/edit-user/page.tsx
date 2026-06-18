import React from "react";
import { getUserById } from "@/app/actions/user.action";
import UserForm from "@/components/forms/user-form";
import { notFound } from "next/navigation";

interface EditUserPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function EditUserPage({ searchParams }: EditUserPageProps) {
  const { id: userId } = await searchParams;

  if (!userId) {
    notFound();
  }

  const result = await getUserById(userId);

  if (!result.success || !result.user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit User</h1>
        <p className="text-sm text-muted-foreground">Update user information</p>
      </div>
      <UserForm
        mode="edit"
        initialData={{
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          image: result.user.image,
          inchargeId: result.user.inchargeId,
          defaultWarehouseId: result.user.defaultWarehouseId,
          status: (result.user as any).status,
          isActive: (result.user as any).isActive,
        }}
      />
    </div>
  );
}
