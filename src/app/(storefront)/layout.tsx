import { ReactNode } from "react";

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      
      <div className="flex-1 pb-16 md:pb-0">{children}</div>
      
      <MobileBottomNav />
    </div>
  );
}
