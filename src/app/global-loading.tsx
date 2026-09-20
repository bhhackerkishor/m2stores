"use client";

import { useEffect, useState } from "react";

export default function GlobalLoading() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5">
      <div className="h-full bg-brand-600 animate-progress-indeterminate" />
    </div>
  );
}
