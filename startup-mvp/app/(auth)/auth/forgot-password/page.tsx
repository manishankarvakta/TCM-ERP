import React from "react";
import ForgotPasswordForm from "@/components/forms/forgot-password-form";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Startup MVP",
  description: "Reset your password",
};

export default function ForgotPasswordPage() {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/0735cf71-dac8-4fa7-bbcd-7b20db098158", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "pre-fix", hypothesisId: "C", location: "app/(auth)/auth/forgot-password/page.tsx:ForgotPasswordPage", message: "ForgotPasswordPage rendered (server)", data: {}, timestamp: Date.now() }) }).catch(() => {});
  // #endregion

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Forgot Password</h1>
        <p className="mt-2 text-muted-foreground">
          {`Enter your email address and we'll send you a verification code`}
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-background">
        <ForgotPasswordForm />
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-primary hover:underline"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

