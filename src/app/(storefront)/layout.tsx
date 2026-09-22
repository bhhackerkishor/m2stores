import { ReactNode } from "react";

// Pass-through: customer chrome (Navbar/Footer/MobileBottomNav) is rendered
// by StorefrontChrome in the root layout so it covers every customer page.
// Keeping this layout empty avoids double-rendering chrome for any future
// routes placed inside the (storefront) group.
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
