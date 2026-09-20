"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare, Facebook, Instagram, Twitter } from "lucide-react";

const SUBJECTS = [
  "General Inquiry",
  "Order Issue",
  "Return / Refund",
  "Shipping Question",
  "Product Question",
  "Partnership / Wholesale",
  "Other",
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const initial: FormState = { name: "", email: "", phone: "", subject: "General Inquiry", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Name is required";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.phone && !/^[+]?[\d\s-]{7,15}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (!form.message.trim()) e.message = "Message is required";
    else if (form.message.trim().length < 10) e.message = "Message must be at least 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setServerError(data.error?.message || "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
      setForm(initial);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const contactInfo = [
    { icon: Mail, label: "Email", value: "support@m2stores.com", href: "mailto:support@m2stores.com" },
    { icon: Phone, label: "Phone", value: "+91 98765 43210", href: "tel:+919876543210" },
    { icon: MapPin, label: "Address", value: "M2Stores, India", href: null },
    { icon: Clock, label: "Hours", value: "Mon–Sat, 9 AM – 7 PM IST", href: null },
  ];

  const socials = [
    { icon: Facebook, label: "Facebook", href: "#" },
    { icon: Instagram, label: "Instagram", href: "#" },
    { icon: Twitter, label: "Twitter", href: "#" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Contact Us
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm max-w-lg mx-auto">
          Have a question, feedback, or need help with an order? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Contact Form */}
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-accent-600 dark:text-accent-400" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Message Sent!</h2>
              <p className="text-surface-500 dark:text-surface-400 text-sm mb-6">
                Thank you for reaching out. We&apos;ll get back to you within 24–48 hours.
              </p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-5">Send us a Message</h2>

              {serverError && (
                <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 dark:text-danger-400 text-sm">
                  {serverError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">
                    Name <span className="text-danger-500">*</span>
                  </label>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Your full name"
                    error={!!errors.name}
                  />
                  {errors.name && <p className="text-xs text-danger-500 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">
                      Email <span className="text-danger-500">*</span>
                    </label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="you@example.com"
                      error={!!errors.email}
                    />
                    {errors.email && <p className="text-xs text-danger-500 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">
                      Phone <span className="text-surface-400 dark:text-surface-500">(optional)</span>
                    </label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="+91 98765 43210"
                      error={!!errors.phone}
                    />
                    {errors.phone && <p className="text-xs text-danger-500 mt-1">{errors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">
                    Subject
                  </label>
                  <select
                    id="contact-subject"
                    value={form.subject}
                    onChange={set("subject")}
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">
                    Message <span className="text-danger-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    value={form.message}
                    onChange={set("message")}
                    placeholder="How can we help you?"
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm resize-none bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
                  />
                  {errors.message && <p className="text-xs text-danger-500 mt-1">{errors.message}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full mt-6" size="lg" isLoading={submitting}>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-4">Get in Touch</h2>
            <div className="space-y-4">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-sm font-medium text-surface-900 dark:text-surface-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-4">Follow Us</h2>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-500 dark:text-surface-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <s.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-2xl p-6">
            <h3 className="font-bold text-surface-900 dark:text-surface-100 mb-1">Need urgent help?</h3>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-3">
              For order emergencies, call us directly or visit our Help Center.
            </p>
            <a
              href="/support"
              className="inline-flex items-center text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Visit Help Center
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
