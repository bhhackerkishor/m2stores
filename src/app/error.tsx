"use client";

import { useEffect } from "react";
import { ServerErrorPage } from "@/components/ui/empty-state";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <ServerErrorPage />
        <button onClick={reset} className="btn btn-primary btn-md rounded-xl mt-4">
          Try Again
        </button>
      </div>
    </div>
  );
}
