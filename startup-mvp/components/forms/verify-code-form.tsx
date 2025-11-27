"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiAlertCircle } from "react-icons/fi";
import { verifyResetCode } from "@/app/actions/password-reset.action";

interface VerifyCodeFormProps {
  email: string;
}

export default function VerifyCodeForm({ email }: VerifyCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, ""); // Only numbers
    setCode(newCode);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) {
        newCode[index] = char;
      }
    });
    setCode(newCode);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = code.join("");

    if (codeString.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await verifyResetCode({ email, code: codeString });

      if (!result.success) {
        throw new Error(result.error || "Invalid code");
      }

      // Navigate to reset password page
      router.push(`/auth/forgot-password/reset?email=${encodeURIComponent(email)}&code=${codeString}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>Enter verification code</Label>
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-lg font-semibold"
              disabled={loading}
            />
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Check your email for the 6-digit code
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading || code.join("").length !== 6}>
        {loading ? "Verifying..." : "Verify Code"}
      </Button>
    </form>
  );
}

