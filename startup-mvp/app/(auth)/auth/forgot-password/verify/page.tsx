import React from "react";
import { redirect } from "next/navigation";
import VerifyCodeForm from "@/components/forms/verify-code-form";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Code | Startup MVP",
  description: "Verify your reset code",
};

interface VerifyPageProps {
  searchParams: Promise<{
    email?: string;
  }>;
}

export default async function VerifyCodePage({ searchParams }: VerifyPageProps) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/auth/forgot-password");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Verify Code</h1>
        <p className="mt-2 text-muted-foreground">
          Enter the 6-digit code sent to {email}
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-background">
        <VerifyCodeForm email={email} />
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Request a new code
        </Link>
      </div>
    </div>
  );
}

