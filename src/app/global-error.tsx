"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-surface-50">
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-24 h-24 text-red-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-surface-900 mb-3">Application Error</h1>
            <p className="text-surface-600 mb-8">Something went wrong. Please try refreshing the page.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => reset()} className="btn-primary">
                Reload Page
              </Button>
              <a href="/" className="btn-secondary">
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
