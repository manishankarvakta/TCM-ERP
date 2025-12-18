import RegistrationForm from "@/components/forms/registration-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Logo from "@/components/layout/logo";

export const metadata: Metadata = {
  title: "Register | Startup MVP",
  description: "Create a new account",
};

export default async function RegistrationPage() {
  const session = await auth();

  // Check if user has valid session with user data
  // When force logged out, session exists but without user.id
  if (session?.user?.id && session?.user?.email) {
    // Redirect based on user role
    const userRole = session.user.role?.toLowerCase();
    if (userRole === "admin") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
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