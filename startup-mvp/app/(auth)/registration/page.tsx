import RegistrationForm from "@/components/forms/registration-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Logo from "@/components/layout/logo";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Register | Startup MVP",
  description: "Create a new account",
};

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function RegistrationPage() {
  const session = await auth();

  // Check if user has valid session with user data
  // When force logged out, session exists but without user.id
  if (session?.user?.id && session?.user?.email) {
    redirect("/dashboard");
  }

  // Check if setup is complete (users exist)
  const userCount = await prisma.user.count();
  
  // If no users exist, redirect to setup
  if (userCount === 0) {
    redirect("/setup");
  }

  // If setup is complete, registration is disabled
  const isRegistrationDisabled = userCount > 0;

  if (isRegistrationDisabled) {
    return (
      <div className="space-y-6 bg-white/40 backdrop-blur-sm dark:bg-black/40 p-8 rounded-lg">
        <div className="text-center space-y-4">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Registration Disabled</h1>
          <p className="text-sm text-muted-foreground">
            Public registration is not available. Please contact your administrator to create an account for you.
          </p>
          <div className="pt-4">
            <Link href="/login">
              <Button className="w-full">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6  bg-white/40 backdrop-blur-sm dark:bg-black/40 p-8 rounded-lg">
      <div className="space-y-2 text-center lg:text-left">
        
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email below to create your account
        </p>
      </div>
      <RegistrationForm />
    </div>
  );
}