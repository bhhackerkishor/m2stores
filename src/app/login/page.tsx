"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Smartphone, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [formData, setFormData] = useState({ identifier: "", password: "", otp: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const url = step === "otp" ? "/api/auth/verify-otp" : "/api/auth/login";
      const body = step === "otp"
        ? { identifier: formData.identifier, otp: formData.otp, type: "login" }
        : { identifier: formData.identifier, password: formData.password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(data.error?.message || "Login failed");
      }
    } catch {
      setError("An error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <span className="text-white font-extrabold text-xl">M2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 mb-1">Welcome Back</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm">Sign in to your M2Stores account</p>
        </div>

        <Card className="p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 dark:text-danger-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                {step === "login" ? "Email or Phone" : "Phone / Email"}
              </label>
              <Input
                type="text"
                placeholder="+91-98765-43210"
                value={formData.identifier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, identifier: e.target.value })}
                leftIcon={<Smartphone className="w-4 h-4" />}
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            {step === "login" && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Password</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                  autoComplete="current-password"
                />
              </div>
            )}

            {step === "otp" && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">OTP</label>
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, "") })}
                  leftIcon={<Mail className="w-4 h-4" />}
                  className="text-center tracking-[0.3em] text-lg font-mono"
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-surface-500 mt-1.5">Enter the 6-digit code sent to your phone</p>
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              {step === "login" ? "Sign In" : "Verify OTP"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              {step === "login" ? "No password?" : "Back to login?"}{" "}
              <button
                onClick={() => { setStep(step === "login" ? "otp" : "login"); setError(""); }}
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                {step === "login" ? "Use OTP instead" : "Sign in with password"}
              </button>
            </p>
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Sign up</a>
            </p>
            <p className="text-sm">
              <a href="/forgot-password" className="text-brand-600 dark:text-brand-400 hover:underline">Forgot password?</a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
