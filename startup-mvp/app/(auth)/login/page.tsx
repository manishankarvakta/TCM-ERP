import LoginForm from "@/components/forms/login-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Logo from "@/components/layout/logo";

export const metadata: Metadata = {
  title: "Login | Startup MVP",
  description: "Sign in to your account",
};

export default async function LoginPage() {
  const session = await auth();

  // Check if user has valid session with user data
  // When force logged out, session exists but without user.id
  if (session?.user?.id && session?.user?.email) {
    // Redirect all authenticated users to dashboard
    // Admin permissions are handled within the dashboard via RBAC
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 bg-white/40 backdrop-blur-sm dark:bg-black/40 p-8 rounded-lg">
    <div className="space-y-2 text-center lg:text-left">
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      <p className="text-sm text-muted-foreground">
        Enter your email below to login to your account
      </p>
    </div>
      <LoginForm />
    </div>
  );
}
