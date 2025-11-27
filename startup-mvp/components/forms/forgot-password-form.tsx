"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiMail, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { sendPasswordResetCode } from "@/app/actions/password-reset.action";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      setLoading(true);
      setError("");

      const result = await sendPasswordResetCode({ email: data.email });

      if (!result.success) {
        throw new Error(result.error || "Failed to send reset code");
      }

      setSuccess(true);
      if ("devCode" in result && result.devCode) {
        setDevCode(result.devCode);
      }

      // Navigate to verify code page after 2 seconds
      setTimeout(() => {
        router.push(`/auth/forgot-password/verify?email=${encodeURIComponent(data.email)}`);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-primary/10 p-4 border border-primary/20">
          <FiCheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-primary mb-1">Code Sent!</h3>
            <p className="text-sm text-muted-foreground">
              If an account exists with this email, a reset code has been sent. Please check your inbox.
            </p>
            {devCode && process.env.NODE_ENV === "development" && (
              <div className="mt-3 p-2 bg-background border rounded text-xs font-mono">
                Dev Code: {devCode}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <FiMail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="pl-10"
            {...register("email")}
            disabled={loading}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Send Reset Code"}
      </Button>
    </form>
  );
}

