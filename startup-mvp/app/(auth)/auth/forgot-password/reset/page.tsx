import React from "react";
import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/forms/reset-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Startup MVP",
  description: "Reset your password",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    email?: string;
    code?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { email, code } = await searchParams;

  if (!email || !code) {
    redirect("/auth/forgot-password");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-background">
        <ResetPasswordForm email={email} code={code} />
      </div>
    </div>
  );
}

