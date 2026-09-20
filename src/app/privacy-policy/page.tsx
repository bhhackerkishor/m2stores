import type { Metadata } from "next";
import { Shield, Eye, Share2, Lock, Cookie, UserCheck, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "M2Stores privacy policy — how we collect, use, and protect your personal information.",
};

const sections = [
  {
    icon: Eye,
    title: "Information We Collect",
    content: [
      "Personal identification information (name, email address, phone number)",
      "Delivery and billing addresses",
      "Payment information (processed securely via PhonePe — we do not store card/UPI details)",
      "Browsing behaviour, device information, and cookies",
      "Order history and product reviews you submit",
    ],
  },
  {
    icon: Eye,
    title: "How We Use Your Information",
    content: [
      "To process and fulfil your orders, including shipping and delivery",
      "To communicate order updates, promotional offers, and customer service responses",
      "To improve our website, product offerings, and user experience",
      "To detect and prevent fraud, unauthorised access, and other illegal activity",
      "To comply with legal obligations under Indian law",
    ],
  },
  {
    icon: Share2,
    title: "Information Sharing",
    content: [
      "Payment Gateway — PhonePe processes all payment data. We never store your card, UPI, or netbanking credentials.",
      "Shipping Partners — We share your name, phone number, and delivery address with courier partners (Delhivery, BlueDart, DTDC, India Post, etc.) to fulfil deliveries.",
      "Legal Requirements — We may disclose information if required by law, court order, or governmental authority in India.",
      "We do not sell or rent your personal information to third parties for marketing purposes.",
    ],
  },
  {
    icon: Lock,
    title: "Data Security",
    content: [
      "All data is transmitted over encrypted HTTPS connections (TLS 1.2+).",
      "Payment information is handled exclusively by PCI-DSS compliant PhonePe infrastructure.",
      "Access to personal data within M2Stores is restricted to authorised personnel on a need-to-know basis.",
      "We conduct regular security audits and vulnerability assessments.",
    ],
  },
  {
    icon: Cookie,
    title: "Cookie Policy",
    content: [
      "We use essential cookies to maintain your session, cart, and login state.",
      "Analytics cookies help us understand how visitors use our site so we can improve it.",
      "You can manage or disable cookies through your browser settings. Disabling essential cookies may affect site functionality.",
      "Third-party services (e.g., Google Analytics) may set their own cookies subject to their policies.",
    ],
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    content: [
      "Access — You can request a copy of the personal data we hold about you.",
      "Correction — You can update or correct your information via your Profile page or by contacting us.",
      "Deletion — You may request deletion of your account and associated data, subject to legal retention requirements.",
      "Opt-out — You can unsubscribe from marketing emails at any time using the link in the email.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm">
          Your privacy matters to us. This policy explains how M2Stores handles your data.
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
              Contact Us
            </h2>
          </div>
          <div className="text-sm text-surface-700 dark:text-surface-300 space-y-1">
            <p>For privacy-related concerns, please reach out to:</p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Email: <a href="mailto:privacy@m2stores.com" className="text-brand-600 dark:text-brand-400 hover:underline">privacy@m2stores.com</a>
            </p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Phone: <a href="tel:+919876543210" className="text-brand-600 dark:text-brand-400 hover:underline">+91 98765 43210</a>
            </p>
            <p className="text-surface-500 dark:text-surface-400 mt-2">
              M2Stores, India
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
