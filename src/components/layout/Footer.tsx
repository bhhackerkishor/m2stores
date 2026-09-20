import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-surface-900 dark:bg-surface-950 text-white border-t border-surface-800">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-extrabold text-sm">M2</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight">M2Stores</span>
            </Link>
            <p className="text-surface-400 text-sm leading-relaxed max-w-xs">
              India&apos;s premium online marketplace for electronics, fashion, home & more. Secure payments, easy returns.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-surface-300 mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/shop", label: "All Products" },
                { href: "/shop?sort=newest", label: "New Arrivals" },
                { href: "/shop?sort=popularity", label: "Bestsellers" },
                { href: "/coupons", label: "Deals & Offers" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-surface-400 hover:text-white text-sm transition-colors duration-150">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-surface-300 mb-4">Account</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/profile", label: "My Profile" },
                { href: "/orders", label: "Orders" },
                { href: "/wishlist", label: "Wishlist" },
                { href: "/profile/addresses", label: "Addresses" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-surface-400 hover:text-white text-sm transition-colors duration-150">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-surface-300 mb-4">Support</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/support", label: "Help Center" },
                { href: "/support", label: "Returns & Refunds" },
                { href: "/profile/addresses", label: "Track Orders" },
                { href: "mailto:support@m2stores.com", label: "Contact Us" },
              ].map((item, i) => (
                <li key={i}>
                  <Link href={item.href} className="text-surface-400 hover:text-white text-sm transition-colors duration-150">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-10 pt-8 border-t border-surface-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs text-surface-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Secure Payments
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              7-Day Returns
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Genuine Products
            </span>
          </div>
          <p className="text-surface-600 text-xs">
            &copy; {new Date().getFullYear()} M2Stores. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
