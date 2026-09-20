import type { Metadata } from "next";
import { RefreshCw, CheckCircle, Clock, CreditCard, Percent, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "M2Stores refund policy — eligibility, process, timelines, and payment-specific details.",
};

const sections = [
  {
    icon: CheckCircle,
    title: "Refund Eligibility",
    content: [
      "Items returned within 7 days of delivery in unused, undamaged condition with original packaging are eligible for a full refund.",
      "Items must not fall under our non-returnable categories (innerwear, perishables, customised products, final sale items).",
      "Partial refunds may be issued if the item shows signs of use, missing tags, or damaged packaging.",
      "Refund eligibility is determined after our warehouse inspects the returned item.",
    ],
  },
  {
    icon: RefreshCw,
    title: "Refund Process",
    content: [
      "Initiate a return from the Orders section in your M2Stores account or contact our support team.",
      "Pack the item securely in its original packaging and schedule a pickup (free for eligible returns).",
      "Once we receive and inspect the item at our warehouse, your refund will be processed.",
      "You will receive an email confirmation once the refund has been initiated.",
    ],
  },
  {
    icon: Clock,
    title: "Refund Timeline",
    content: [
      "After we receive the returned item, inspection takes 1–2 business days.",
      "Refunds are processed within 3–5 business days after inspection.",
      "The total time from return initiation to refund in your account is typically 7–10 business days.",
      "Bank processing times may vary — UPI refunds are usually faster than card refunds.",
    ],
  },
  {
    icon: CreditCard,
    title: "Payment Method Specific Refunds",
    content: [
      "PhonePe (UPI/Cards/Netbanking): Refund is credited back to the original payment source. UPI refunds reflect within 24–48 hours; card refunds within 5–7 business days depending on your bank.",
      "Cash on Delivery (COD): Refund is transferred to your bank account via NEFT/IMPS. Please provide valid bank details to our support team. Reflects within 5–7 business days.",
      "Store Credit: In some cases, we may offer store credit as an alternative to a monetary refund. Store credit never expires and can be used on any order.",
    ],
  },
  {
    icon: Percent,
    title: "Partial Refunds",
    content: [
      "If a returned item is found to be used, damaged, or missing original accessories/tags, a partial refund (up to 50%) may be issued at our discretion.",
      "Shipping charges are non-refundable unless the return is due to our error (wrong item, defective product).",
      "COD handling fees are non-refundable.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-7 h-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Refund Policy
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm">
          How refunds work at M2Stores — from eligibility to timelines.
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
                  {item}
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
              Refund Issues?
            </h2>
          </div>
          <div className="text-sm text-surface-700 dark:text-surface-300 space-y-1">
            <p>If your refund is delayed or you have questions:</p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Email: <a href="mailto:refunds@m2stores.com" className="text-brand-600 dark:text-brand-400 hover:underline">refunds@m2stores.com</a>
            </p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Phone: <a href="tel:+919876543210" className="text-brand-600 dark:text-brand-400 hover:underline">+91 98765 43210</a>
            </p>
            <p className="text-surface-500 dark:text-surface-400 mt-2">
              Please have your order number ready for faster assistance.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
