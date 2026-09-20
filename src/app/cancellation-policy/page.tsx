import type { Metadata } from "next";
import { XCircle, Package, RotateCcw, Clock, Ban, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "M2Stores cancellation policy — how to cancel orders, refund timelines, and non-cancellable items.",
};

const sections = [
  {
    icon: Package,
    title: "Cancellation Before Dispatch",
    content: [
      "You can cancel your order at any time before it has been dispatched from our warehouse.",
      "A full refund will be issued to your original payment method within 5–7 business days.",
      "No cancellation fee is charged for orders cancelled before dispatch.",
    ],
  },
  {
    icon: XCircle,
    title: "Cancellation After Dispatch",
    content: [
      "Once an order has been dispatched, it cannot be cancelled directly.",
      "You may refuse delivery at the door, or use our return policy after receiving the item.",
      "Returns for dispatched orders are subject to our 7-day return policy.",
    ],
  },
  {
    icon: RotateCcw,
    title: "How to Cancel",
    content: [
      "Go to My Orders in your M2Stores account and select the order you wish to cancel.",
      "Click the Cancel Order button and confirm your cancellation request.",
      "Alternatively, you can contact our support team via email or phone with your order number.",
      "Cancellation requests are processed within 24 hours.",
    ],
  },
  {
    icon: Clock,
    title: "Refund Timeline",
    content: [
      "Online payments (PhonePe): Refund is processed within 5–7 business days back to the original payment method.",
      "Cash on Delivery (COD): Refund is transferred to your bank account within 5–7 business days via NEFT/IMPS.",
      "You will receive an email confirmation once the refund has been initiated.",
    ],
  },
  {
    icon: Ban,
    title: "Non-Cancellable Items",
    content: [
      "Customised or personalised products cannot be cancelled once production has begun.",
      "Perishable goods (food items, flowers) cannot be cancelled after dispatch.",
      "Products marked as &quot;Final Sale&quot; or &quot;Non-Returnable&quot; at the time of purchase.",
      "Gift cards and digital vouchers are non-cancellable once delivered.",
    ],
  },
];

export default function CancellationPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Cancellation Policy
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm">
          How to cancel your M2Stores orders and what to expect.
        </p>
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
          Last updated: September 20, 2026
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
                <section.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                {section.title}
              </h2>
            </div>
            <ul className="space-y-2.5 ml-1">
              {section.content.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Need Help?
            </h2>
          </div>
          <div className="text-sm text-surface-700 dark:text-surface-300 space-y-1">
            <p>If you have any questions about cancelling your order:</p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Email: <a href="mailto:support@m2stores.com" className="text-brand-600 dark:text-brand-400 hover:underline">support@m2stores.com</a>
            </p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Phone: <a href="tel:+919876543210" className="text-brand-600 dark:text-brand-400 hover:underline">+91 98765 43210</a>
            </p>
            <p className="text-surface-500 dark:text-surface-400 mt-2">
              Support hours: Monday – Saturday, 9:00 AM – 7:00 PM IST
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
