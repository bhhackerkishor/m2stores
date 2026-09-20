"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();

      if (data.success) {
        setSent(true);
      } else {
        setError(data.error?.message || "Failed to send reset email");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, otp, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/login");
        router.refresh();
      } else {
        setError(data.error?.message || "Reset failed");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
        <Card className="text-center max-w-md">
          <div className="w-14 h-14 bg-accent-50 dark:bg-accent-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-accent-600 dark:text-accent-400" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-1">Check Your Phone</h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">We sent a reset OTP to {identifier}</p>
          <p className="text-xs text-surface-400 dark:text-surface-500">Use this OTP to set a new password.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-elevated">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-1">Forgot Password</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">Enter your phone number to reset</p>
        </div>

        <Card>
          {error && (
            <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-700 dark:text-danger-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone-input" className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
              <Input
                id="phone-input"
                type="tel"
                autoComplete="tel"
                placeholder="+91-98765-43210"
                autoFocus
                value={identifier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              Send Reset OTP
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-brand-600 dark:text-brand-400 text-sm hover:underline">Back to login</a>
          </div>
        </Card>
      </div>
    </div>
  );
}
