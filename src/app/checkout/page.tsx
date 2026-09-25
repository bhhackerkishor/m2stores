// app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutSkeleton } from "@/components/ui/skeleton";
import { VariantChips } from "@/components/ui/variant-chips";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  MapPin,
  ArrowRight,
  Truck,
  Wallet,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Banknote,
  Plus,
  ShieldCheck,
  AlertCircle,
  Tag,
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Zap,
} from "lucide-react";

type Step = 1 | 2 | 3;

interface Addr {
  _id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
};

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [addressId, setAddressId] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [paymentMethod, setPaymentMethod] = useState<"PHONEPE" | "COD">("PHONEPE");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [codPreview, setCodPreview] = useState<{ eligible: boolean; reason?: string; fee: number } | null>(null);
  const [deliveryCheck, setDeliveryCheck] = useState<{ deliverable: boolean; reason?: string } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const csrfRef = useRef<string>("");

  const getCsrfToken = () => csrfRef.current;

  const goToStep = (n: Step) => {
    setDirection(n > step ? 1 : -1);
    setStep(n);
  };

  const loadCsrf = async () => {
    try {
      const res = await fetch("/api/csrf");
      const data = await res.json();
      if (data.success) csrfRef.current = data.data.token;
    } catch {}
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/summary", { cache: "no-store" });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          router.push("/login?redirect=/checkout");
          return;
        }
        setError(data.error?.message || "Failed to load checkout");
        return;
      }
      setAddresses(data.data.addresses || []);
      const def = (data.data.addresses || []).find((a: Addr) => a.isDefault) || data.data.addresses?.[0];
      if (def && !addressId) setAddressId(def._id);
      if ((data.data.cart?.items || []).length === 0) {
        router.push("/cart");
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCsrf();
    loadSummary();
    trackEvent("checkout_started", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAddress = addresses.find((a) => a._id === addressId);
  useEffect(() => {
    if (!selectedAddress?.pincode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/checkout/summary?pincode=${encodeURIComponent(selectedAddress.pincode)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled || !data.success) return;
        setCodPreview(data.data.codPreview || null);
        setDeliveryCheck(data.data.deliveryCheck || null);
        if (data.data.codPreview && !data.data.codPreview.eligible && paymentMethod === "COD") {
          setPaymentMethod("PHONEPE");
        }
      } catch {
        /* non-blocking — server revalidates on review */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?._id, selectedAddress?.pincode]);

  const revalidate = async () => {
    if (!addressId) {
      setError("Please select a delivery address.");
      return;
    }
    setQuoting(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ addressId, shippingMethod, paymentMethod, couponCode: coupon || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Validation failed");
        return;
      }
      setQuote(data.data);
      goToStep(3);
    } finally {
      setQuoting(false);
    }
  };

  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({
          addressId,
          shippingMethod,
          paymentMethod,
          couponCode: coupon || undefined,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to place order");
        toast.error("Order failed", data.error?.message || "Please try again");
        return;
      }
      const orderNumber = data.data.order?.orderNumber;
      const total = data.data.order?.pricingSnapshot?.grandTotal;
      trackEvent("order_created", { orderNumber, total, method: paymentMethod });
      if (paymentMethod === "COD") {
        trackEvent("purchase", { orderNumber, total, method: "COD" });
        toast.success("Order placed!", `Order #${orderNumber} confirmed. Pay on delivery.`);
        router.push(`/order-success?orderNumber=${orderNumber}&method=COD`);
        return;
      }
      trackEvent("payment_started", { orderNumber, total, method: "PHONEPE" });
      toast.info("Redirecting to payment...", "You'll be taken to PhonePe to complete payment.");
      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ orderNumber }),
      });
      const payData = await payRes.json();
      if (!payData.success || !payData.data?.redirectUrl) {
        router.push(`/order-success?orderNumber=${orderNumber}&method=PHONEPE&pending=1&payError=1`);
        return;
      }
      window.location.href = payData.data.redirectUrl;
    } finally {
      setPlacing(false);
    }
  };

  const steps = useMemo(
    () => [
      { n: 1, label: "Address", icon: MapPin },
      { n: 2, label: "Delivery & Payment", icon: Truck },
      { n: 3, label: "Review & Confirm", icon: Wallet },
    ],
    []
  );

  if (loading) return <CheckoutSkeleton />;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-200 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-surface-200 dark:border-surface-800">
          <div>
            <h1 className="!text-2xl sm:!text-3xl">Checkout</h1>
            <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
              Complete your purchase securely in a few quick steps.
            </p>
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-surface-600 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Return to Cart</span>
          </Link>
        </div>

        {/* Stepper */}
        <nav aria-label="Checkout progress" className="mb-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.n;
              const isDone = step > s.n;

              return (
                <div
                  key={s.n}
                  onClick={() => isDone && goToStep(s.n as Step)}
                  className={`relative overflow-hidden flex flex-col sm:flex-row items-center gap-3 p-3 sm:p-4 rounded-lg border select-none ${
                    isDone ? "cursor-pointer" : ""
                  } ${
                    isActive
                      ? "border-brand-600 dark:border-brand-400"
                      : isDone
                      ? "border-accent-200 dark:border-accent-800 hover:border-accent-400 dark:hover:border-accent-600"
                      : "border-surface-200 dark:border-surface-800"
                  } transition-colors duration-200`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="step-highlight"
                      transition={{ duration: 0.35, ease: EASE }}
                      className="absolute inset-0 bg-brand-600 dark:bg-brand-500 -z-0"
                    />
                  )}
                  {!isActive && (
                    <div
                      className={`absolute inset-0 -z-0 ${
                        isDone ? "bg-accent-50 dark:bg-accent-950/30" : "bg-surface-50 dark:bg-surface-900/40"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                      isActive
                        ? "bg-white/15 text-white"
                        : isDone
                        ? "bg-accent-600 dark:bg-accent-500 text-white"
                        : "bg-surface-200 dark:bg-surface-800 text-surface-500 dark:text-surface-400"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="relative z-10 text-center sm:text-left min-w-0">
                    <p
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        isActive ? "text-white/70" : isDone ? "text-accent-600 dark:text-accent-400" : "text-surface-400 dark:text-surface-500"
                      }`}
                    >
                      Step 0{s.n}
                    </p>
                    <p className={`text-xs sm:text-sm font-bold truncate ${isActive ? "text-white" : isDone ? "text-accent-800 dark:text-accent-200" : "text-surface-500 dark:text-surface-500"}`}>
                      {s.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress rail */}
          <div className="mt-3 h-1 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
            <motion.div
              className="h-full bg-brand-600 dark:bg-brand-500 rounded-full"
              initial={false}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          </div>
        </nav>

        {/* Global Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-6 p-4 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-700 dark:text-danger-400 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-danger-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Checkout Alert</p>
                <p className="text-xs mt-0.5 opacity-90">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1: ADDRESS */}
          {step === 1 && (
            <motion.div key="step-1" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: EASE }}>
              <Card className="p-6 sm:p-8 bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="!text-lg !font-bold font-sans text-surface-900 dark:text-white">Delivery Address</h2>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      Choose where you want your items delivered.
                    </p>
                  </div>
                  <Link
                    href="/profile/addresses"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 px-3.5 py-2 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add / Manage</span>
                  </Link>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-500 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-surface-900 dark:text-white mb-1">No saved addresses found</h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-6 max-w-sm mx-auto">
                      Add a primary address to proceed with order delivery and stock verification.
                    </p>
                    <Link
                      href="/profile/addresses"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add New Address
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((a) => {
                      const isSelected = addressId === a._id;
                      return (
                        <div
                          key={a._id}
                          onClick={() => setAddressId(a._id)}
                          className={`relative p-5 rounded-lg border-2 cursor-pointer transition-colors duration-200 flex flex-col justify-between ${
                            isSelected
                              ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500"
                              : "border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-surface-900 dark:text-white">{a.name}</span>
                                {a.isDefault && (
                                  <Badge variant="info" size="sm" className="text-[10px] px-2 py-0.5 font-bold">
                                    DEFAULT
                                  </Badge>
                                )}
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "border-brand-500 bg-brand-500 text-white"
                                    : "border-surface-300 dark:border-surface-700"
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                            </div>

                            <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                              {a.addressLine1}
                              {a.addressLine2 ? `, ${a.addressLine2}` : ""}
                            </p>
                            <p className="text-xs font-semibold text-surface-700 dark:text-surface-200">
                              {a.city}, {a.state} —{" "}
                              <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">{a.pincode}</span>
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-surface-200/60 dark:border-surface-800/60 flex items-center justify-between text-[11px] text-surface-500 dark:text-surface-400">
                            <span>
                              Phone: <strong className="text-surface-700 dark:text-surface-300">{a.phone}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                    <ShieldCheck className="w-4 h-4 text-accent-500 dark:text-accent-400 shrink-0" />
                    <span>Your address information is securely encrypted.</span>
                  </div>

                  <Button
                    className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 active:scale-[0.98] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 dark:focus:ring-offset-surface-950 flex items-center justify-center gap-2 group cursor-pointer"
                    onClick={() => (addressId ? goToStep(2) : setError("Please select a delivery address."))}
                  >
                    <span>Continue to Delivery</span>
                    <ArrowRight className="w-4 h-4 text-white/80 group-hover:text-white group-hover:translate-x-1 transition-transform duration-200 ease-out" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: DELIVERY & PAYMENT */}
          {step === 2 && (
            <motion.div key="step-2" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: EASE }}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
                  {/* Delivery Speed */}
                  <Card className="p-6 sm:p-8 bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="!text-base !font-bold font-sans text-surface-900 dark:text-white">Delivery Speed</h2>
                        <p className="text-xs text-surface-500 dark:text-surface-400">Select estimated dispatch and delivery velocity.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(["STANDARD", "EXPRESS"] as const).map((m) => {
                        const isSelected = shippingMethod === m;
                        return (
                          <div
                            key={m}
                            onClick={() => setShippingMethod(m)}
                            className={`p-5 rounded-lg border-2 cursor-pointer transition-colors duration-200 ${
                              isSelected
                                ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500"
                                : "border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm text-surface-900 dark:text-white">
                                {m === "STANDARD" ? "Standard Delivery" : "Express Priority"}
                              </span>
                              {m === "EXPRESS" && (
                                <Badge className="bg-warning-50 dark:bg-warning-950/30 text-warning-700 dark:text-warning-400 border border-warning-200 dark:border-warning-800 text-[10px]">
                                  FAST
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-surface-500 dark:text-surface-400">
                              {m === "STANDARD" ? "Est. 3–5 Business Days" : "Est. 1–2 Business Days"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Payment Method */}
                  <Card className="p-6 sm:p-8 bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="!text-base !font-bold font-sans text-surface-900 dark:text-white">Payment Method</h2>
                        <p className="text-xs text-surface-500 dark:text-surface-400">Select your preferred payment gateway or option.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div
                        onClick={() => setPaymentMethod("PHONEPE")}
                        className={`p-5 rounded-lg border-2 cursor-pointer transition-colors duration-200 ${
                          paymentMethod === "PHONEPE"
                            ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500"
                            : "border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <CreditCard className={`w-5 h-5 ${paymentMethod === "PHONEPE" ? "text-brand-600 dark:text-brand-400" : "text-surface-400"}`} />
                          <span className="font-bold text-sm text-surface-900 dark:text-white">PhonePe Gateway</span>
                        </div>
                        <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                          Instant &amp; secure payment via UPI, Cards, Netbanking, or Wallet.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          if (codPreview === null || codPreview.eligible) setPaymentMethod("COD");
                        }}
                        className={`p-5 rounded-lg border-2 transition-colors duration-200 ${
                          paymentMethod === "COD"
                            ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500"
                            : "border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700"
                        } ${
                          codPreview !== null && !codPreview.eligible
                            ? "opacity-50 cursor-not-allowed bg-surface-100/50 dark:bg-surface-800/30"
                            : "cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Banknote className={`w-5 h-5 ${paymentMethod === "COD" ? "text-brand-600 dark:text-brand-400" : "text-surface-400"}`} />
                          <span className="font-bold text-sm text-surface-900 dark:text-white">Cash on Delivery</span>
                        </div>
                        <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                          {codPreview !== null && !codPreview.eligible
                            ? codPreview.reason || "Not available for selected pincode."
                            : "Pay cash at your doorstep upon order arrival."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-surface-200 dark:border-surface-800">
                      <label className="text-2xs font-bold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-2 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        <span>Have a promo coupon?</span>
                      </label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={coupon}
                          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                          placeholder="ENTER COUPON CODE"
                          className="uppercase font-mono text-sm tracking-wider bg-surface-50 dark:bg-surface-950 border-surface-200 dark:border-surface-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Sidebar — theme-aware, no longer forced dark */}
                <div className="lg:col-span-4 sticky top-6">
                  <Card className="relative overflow-hidden p-6 bg-white dark:bg-surface-900 border border-brand-200 dark:border-brand-900 rounded-xl shadow-card-hover space-y-6">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-brand-600 dark:bg-brand-500" />
                    <div>
                      <h3 className="!text-base !font-bold font-sans text-surface-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-600 dark:bg-brand-400" />
                        Ready for Review?
                      </h3>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 leading-relaxed">
                        We re-check real-time stock levels, live prices, and address coverage before locking in payment details.
                      </p>
                    </div>

                    <AnimatePresence>
                      {deliveryCheck && !deliveryCheck.deliverable && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg text-xs text-danger-700 dark:text-danger-400"
                        >
                          {deliveryCheck.reason || "Delivery service unavailable for this pincode."}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-3 pt-2">
                      <Button
                        className="w-full py-4 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 active:scale-[0.98] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={revalidate}
                        isLoading={quoting}
                        disabled={Boolean(deliveryCheck && !deliveryCheck.deliverable)}
                      >
                        {quoting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Validate &amp; Review Order</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full py-3 text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold rounded-lg transition-colors"
                        onClick={() => goToStep(1)}
                      >
                        Back to Address
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: REVIEW & PLACE ORDER */}
          {step === 3 && quote && (
            <motion.div key="step-3" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: EASE }}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <Card className="p-6 sm:p-8 bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 rounded-xl shadow-card">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-200 dark:border-surface-800">
                      <h2 className="!text-base !font-bold font-sans text-surface-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        <span>Order Items ({quote.items.length})</span>
                      </h2>
                      <button
                        onClick={() => goToStep(2)}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline transition-colors"
                      >
                        Edit Selections
                      </button>
                    </div>

                    <div className="divide-y divide-surface-200/60 dark:divide-surface-800/60">
                      {quote.items.map((it: any) => (
                        <div key={`${it.productId}-${it.sku}`} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-center">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800 shrink-0 border border-surface-200/80 dark:border-surface-800">
                            <Image src={it.image || "/images/placeholder-product.svg"} alt={it.name} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-surface-900 dark:text-white truncate">{it.name}</p>
                            <VariantChips attributes={it.attributes} size="xs" />
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                              SKU: <span className="font-mono text-surface-700 dark:text-surface-300">{it.sku}</span> &times;{" "}
                              <strong className="text-surface-900 dark:text-white">{it.quantity}</strong>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="price-sm">{formatPrice(it.lineTotal)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {quote.issues?.length > 0 && (
                      <div className="mt-6 space-y-2 pt-4 border-t border-surface-200 dark:border-surface-800">
                        {quote.issues.map((iss: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg text-xs text-warning-700 dark:text-warning-400 flex items-center gap-2"
                          >
                            <Zap className="w-4 h-4 text-warning-500 shrink-0" />
                            <span>{iss.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                <div className="lg:col-span-5 sticky top-6">
                  <Card className="p-6 sm:p-8 bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 rounded-xl shadow-card-hover space-y-6">
                    <h3 className="!text-base !font-bold font-sans text-surface-900 dark:text-white pb-4 border-b border-surface-200 dark:border-surface-800">
                      Payment Calculation
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-surface-600 dark:text-surface-400">
                        <span>Subtotal</span>
                        <span className="font-semibold text-surface-900 dark:text-white">{formatPrice(quote.pricing.subtotal)}</span>
                      </div>

                      {quote.pricing.couponDiscount > 0 && (
                        <div className="flex justify-between text-accent-600 dark:text-accent-400 font-medium">
                          <span>Coupon ({quote.pricing.couponCode})</span>
                          <span>&minus;{formatPrice(quote.pricing.couponDiscount)}</span>
                        </div>
                      )}

                      {(quote.pricing.offerDiscount || 0) > 0 && (
                        <div className="flex justify-between text-accent-600 dark:text-accent-400 font-medium">
                          <span>Offer ({quote.pricing.offerTitle || "Discount"})</span>
                          <span>&minus;{formatPrice(quote.pricing.offerDiscount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-surface-600 dark:text-surface-400">
                        <span>Shipping ({shippingMethod})</span>
                        <span className="font-semibold text-surface-900 dark:text-white">
                          {quote.selectedShipping.fee === 0 ? (
                            <span className="text-accent-600 dark:text-accent-400 font-bold">FREE</span>
                          ) : (
                            formatPrice(quote.selectedShipping.fee)
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-surface-600 dark:text-surface-400">
                        <span>Estimated Tax</span>
                        <span className="font-semibold text-surface-900 dark:text-white">{formatPrice(quote.pricing.taxTotal)}</span>
                      </div>

                      {quote.pricing.codFee > 0 && (
                        <div className="flex justify-between text-surface-600 dark:text-surface-400">
                          <span>COD Service Fee</span>
                          <span className="font-semibold text-surface-900 dark:text-white">{formatPrice(quote.pricing.codFee)}</span>
                        </div>
                      )}

                      <div className="pt-4 border-t border-surface-200 dark:border-surface-800 flex justify-between items-baseline">
                        <div>
                          <span className="text-base font-bold text-surface-900 dark:text-white">Grand Total</span>
                          <p className="text-[10px] text-surface-400 dark:text-surface-500">Includes taxes &amp; charges</p>
                        </div>
                        <span className="price-lg text-brand-600 dark:text-brand-400">
                          {formatPrice(
                            quote.pricing.subtotal -
                              quote.pricing.couponDiscount -
                              (quote.pricing.offerDiscount || 0) +
                              quote.selectedShipping.fee +
                              quote.pricing.codFee +
                              quote.pricing.taxTotal
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Button
                        className="w-full py-4 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 active:scale-[0.98] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={placeOrder}
                        isLoading={placing}
                        disabled={placing}
                      >
                        {placing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : paymentMethod === "COD" ? (
                          "Confirm & Place Order (COD)"
                        ) : (
                          "Proceed to PhonePe Payment"
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full py-3 text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold rounded-lg transition-colors"
                        onClick={() => goToStep(2)}
                        disabled={placing}
                      >
                        Change Shipping or Payment
                      </Button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-surface-400 dark:text-surface-500 text-center">
                      <ShieldCheck className="w-4 h-4 text-accent-500 dark:text-accent-400 shrink-0" />
                      <span>256-bit Encrypted SSL Payment Checkout</span>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}