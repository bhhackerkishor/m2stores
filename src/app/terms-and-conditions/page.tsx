import type { Metadata } from "next";
import { FileText, UserPlus, Tag, ShoppingCart, Truck, RotateCcw, Scale, AlertTriangle, Gavel, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "M2Stores terms and conditions governing your use of our website and services.",
};

const sections = [
  {
    icon: FileText,
    title: "Acceptance of Terms",
    content: [
      "By accessing or using the M2Stores website and services, you agree to be bound by these Terms and Conditions.",
      "If you do not agree with any part of these terms, you must not use our website or services.",
      "We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance.",
    ],
  },
  {
    icon: UserPlus,
    title: "Account Registration",
    content: [
      "You must be at least 18 years of age to create an account and make purchases.",
      "You are responsible for maintaining the confidentiality of your account credentials.",
      "You must provide accurate, current, and complete information during registration.",
      "M2Stores reserves the right to suspend or terminate accounts that violate these terms.",
    ],
  },
  {
    icon: Tag,
    title: "Products and Pricing",
    content: [
      "All prices are displayed in Indian Rupees (INR) and are inclusive of GST unless stated otherwise.",
      "We reserve the right to change prices without prior notice. However, once an order is confirmed, the price will not change.",
      "Product images are for illustration purposes. Actual products may vary slightly in colour or appearance.",
      "In the event of a pricing error, we reserve the right to cancel the order and issue a full refund.",
    ],
  },
  {
    icon: ShoppingCart,
    title: "Orders and Payment",
    content: [
      "Placing an order does not guarantee acceptance. We may refuse or cancel orders at our discretion.",
      "Payment can be made via PhonePe (UPI, credit/debit cards, netbanking) or Cash on Delivery (COD).",
      "All online payments are processed through PhonePe's PCI-DSS compliant infrastructure.",
      "For COD orders, full payment must be made at the time of delivery in cash or accepted digital methods.",
    ],
  },
  {
    icon: Truck,
    title: "Shipping and Delivery",
    content: [
      "Standard shipping takes 3–7 business days across India. Express shipping takes 1–2 business days.",
      "Free standard shipping is available on orders above ₹499.",
      "Delivery timelines are estimates and may vary due to factors beyond our control (weather, strikes, remote locations).",
      "Risk of loss and title for items pass to you upon delivery to the shipping partner.",
    ],
  },
  {
    icon: RotateCcw,
    title: "Returns and Refunds",
    content: [
      "Products can be returned within 7 days of delivery if they are unused, undamaged, and in original packaging.",
      "Certain items (innerwear, perishables, customised products) are non-returnable.",
      "Refunds are processed within 5–7 business days after the returned item is received and inspected.",
      "Online payment refunds are credited back to the original payment method. COD refunds are processed via bank transfer.",
    ],
  },
  {
    icon: Scale,
    title: "Intellectual Property",
    content: [
      "All content on this website — including logos, text, images, graphics, and software — is the property of M2Stores or its licensors.",
      "You may not reproduce, distribute, modify, or create derivative works without prior written consent.",
      "Product names, logos, and brands mentioned on the site are property of their respective owners.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Limitation of Liability",
    content: [
      "M2Stores shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services.",
      "Our total liability shall not exceed the total amount paid by you for the specific order in question.",
      "We are not responsible for delays or failures caused by circumstances beyond our reasonable control (force majeure).",
    ],
  },
  {
    icon: Gavel,
    title: "Governing Law",
    content: [
      "These Terms and Conditions are governed by and construed in accordance with the laws of India.",
      "Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in India.",
      "Disputes shall first be attempted to be resolved amicably through our customer support before approaching courts.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Terms and Conditions
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm">
          Please read these terms carefully before using M2Stores.
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
            <p>For questions about these Terms and Conditions:</p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Email: <a href="mailto:support@m2stores.com" className="text-brand-600 dark:text-brand-400 hover:underline">support@m2stores.com</a>
            </p>
            <p className="font-medium text-surface-900 dark:text-surface-100">
              Phone: <a href="tel:+919876543210" className="text-brand-600 dark:text-brand-400 hover:underline">+91 98765 43210</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
