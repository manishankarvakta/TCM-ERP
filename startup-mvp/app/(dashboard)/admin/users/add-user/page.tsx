import React from "react";
import UserForm from "@/components/forms/user-form";

export default function AddUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add New User</h1>
        <p className="text-sm text-muted-foreground">Create a new user account</p>
      </div>
      <UserForm mode="create" />
    </div>
  );
}
