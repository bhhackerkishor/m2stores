import type { Metadata } from "next";
import { Truck, Zap, IndianRupee, MapPin, Package, CreditCard, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "M2Stores shipping policy — delivery timelines, charges, COD availability, and order tracking.",
};

const shippingMethods = [
  {
    icon: Truck,
    name: "Standard Shipping",
    timeline: "3–5 business days",
    fee: "Free on orders above ₹499. ₹49 for orders below ₹499.",
    description: "Reliable delivery across India via our trusted courier partners.",
  },
  {
    icon: Zap,
    name: "Express Shipping",
    timeline: "1–2 business days",
    fee: "₹149 per order",
    description: "Priority handling and faster delivery for urgent orders. Available in select metro cities.",
  },
];

export default function ShippingPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center mx-auto mb-4">
          <Truck className="w-7 h-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Shipping Policy
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm">
          Everything you need to know about how we deliver your orders.
        </p>
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
          Last updated: September 20, 2026
        </p>
      </div>

      <div className="space-y-6">
        {/* Shipping Methods */}
        <section className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Shipping Methods
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shippingMethods.map((method) => (
              <div
                key={method.name}
                className="border border-surface-200 dark:border-surface-700 rounded-xl p-5"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <method.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  <h3 className="font-bold text-surface-900 dark:text-surface-100">{method.name}</h3>
                </div>
                <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mb-1">{method.timeline}</p>
                <p className="text-sm text-surface-600 dark:text-surface-400 mb-1">{method.fee}</p>
                <p className="text-xs text-surface-500 dark:text-surface-500">{method.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Free Shipping */}
        <section className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Free Shipping
            </h2>
          </div>
          <ul className="space-y-2.5 ml-1">
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-400 dark:bg-accent-500 shrink-0" />
              Free standard shipping on all orders above <strong>₹499</strong>.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-400 dark:bg-accent-500 shrink-0" />
              A flat shipping fee of ₹49 applies to orders below ₹499.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-400 dark:bg-accent-500 shrink-0" />
              Free shipping thresholds apply to standard shipping only. Express shipping is charged separately.
            </li>
          </ul>
        </section>

        {/* COD */}
        <section className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Cash on Delivery (COD)
            </h2>
          </div>
          <ul className="space-y-2.5 ml-1">
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              COD is available for orders up to ₹10,000 across most pin codes in India.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              A COD handling fee of ₹49 may apply.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              Please keep exact change ready at the time of delivery.
            </li>
          </ul>
        </section>

        {/* Pincode Coverage */}
        <section className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Pincode Coverage
            </h2>
          </div>
          <ul className="space-y-2.5 ml-1">
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              We deliver to most serviceable pincodes across India.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              You can check pincode serviceability on the product page or at checkout before placing your order.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              Remote or restricted areas may have longer delivery timelines or may not be serviceable.
            </li>
          </ul>
        </section>

        {/* Order Tracking */}
        <section className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Order Tracking
            </h2>
          </div>
          <ul className="space-y-2.5 ml-1">
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              Once your order is shipped, you will receive an email and SMS with the tracking ID and courier partner details.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              You can track your order in real time from the <strong>Orders</strong> section in your M2Stores account.
            </li>
            <li className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
              For any shipping-related queries, contact our support team.
            </li>
          </ul>
        </section>

        {/* Shipping Charges Breakdown */}
        <section className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Shipping Charges Summary
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="text-left py-2.5 pr-4 font-semibold text-surface-700 dark:text-surface-300">Method</th>
                  <th className="text-left py-2.5 pr-4 font-semibold text-surface-700 dark:text-surface-300">Timeline</th>
                  <th className="text-left py-2.5 font-semibold text-surface-700 dark:text-surface-300">Charge</th>
                </tr>
              </thead>
              <tbody className="text-surface-600 dark:text-surface-400">
                <tr className="border-b border-surface-100 dark:border-surface-800">
                  <td className="py-2.5 pr-4">Standard (≥ ₹499)</td>
                  <td className="py-2.5 pr-4">3–5 days</td>
                  <td className="py-2.5 font-semibold text-accent-600 dark:text-accent-400">FREE</td>
                </tr>
                <tr className="border-b border-surface-100 dark:border-surface-800">
                  <td className="py-2.5 pr-4">Standard (&lt; ₹499)</td>
                  <td className="py-2.5 pr-4">3–5 days</td>
                  <td className="py-2.5">₹49</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4">Express</td>
                  <td className="py-2.5 pr-4">1–2 days</td>
                  <td className="py-2.5">₹149</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
