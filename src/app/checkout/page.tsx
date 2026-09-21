"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/providers/ToastProvider";
import { formatPrice } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { MapPin, Truck, Wallet, CheckCircle2, ChevronRight, CreditCard, Banknote } from "lucide-react";

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

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [addressId, setAddressId] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [paymentMethod, setPaymentMethod] = useState<"PHONEPE" | "COD">("PHONEPE");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const csrfRef = useRef<string>("");

  const getCsrfToken = () => csrfRef.current;

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
        headers: { "Content-Type": "application/json" ,"X-CSRF-Token": getCsrfToken(),  },
        body: JSON.stringify({ addressId, shippingMethod, paymentMethod, couponCode: coupon || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Validation failed");
        return;
      }
      setQuote(data.data);
      setStep(3);
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
        headers: { 
          "Content-Type": "application/json" ,
          "X-CSRF-Token": getCsrfToken(),},
        body: JSON.stringify({ addressId, shippingMethod, paymentMethod, couponCode: coupon || undefined, idempotencyKey: idempotencyKey.current }),
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
        headers: { "Content-Type": "application/json","X-CSRF-Token": getCsrfToken(), },
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
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 tracking-tight mb-6">Checkout</h1>

      {/* Stepper */}
      <nav aria-label="Checkout progress" className="flex items-center gap-1 sm:gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1.5 sm:gap-2 flex-1">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors duration-200 ${
              step > s.n
                ? "bg-accent-500 text-white"
                : step === s.n
                ? "bg-brand-600 text-white shadow-glow"
                : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400"
            }`}>
              {step > s.n ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : s.n}
            </div>
            <span className={`text-xs sm:text-sm font-medium hidden sm:block ${step >= s.n ? "text-surface-900 dark:text-surface-100" : "text-surface-500 dark:text-surface-400"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-surface-300 dark:text-surface-600 ml-auto hidden sm:block" />}
          </div>
        ))}
      </nav>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl text-danger-700 dark:text-danger-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          {error}
        </div>
      )}

      {/* Step 1: Address */}
      {step === 1 && (
        <Card>
          <h2 className="font-semibold text-lg mb-4">Delivery Address</h2>
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-surface-400" />
              </div>
              <p className="text-surface-600 dark:text-surface-400 mb-4">No addresses yet. Add one to continue.</p>
              <Link href="/profile/addresses" className="btn btn-primary btn-md rounded-xl inline-flex">
                Manage Addresses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {addresses.map((a) => (
                <button
                  key={a._id}
                  onClick={() => setAddressId(a._id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                    addressId === a._id
                      ? "border-brand-600 bg-brand-50 dark:bg-brand-950/30 shadow-glow"
                      : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{a.name}</p>
                    {a.isDefault && <Badge variant="info" size="sm">Default</Badge>}
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}</p>
                  <p className="text-sm text-surface-600 dark:text-surface-400">{a.city} — {a.pincode}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">{a.phone}</p>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-between mt-6">
            <Link href="/profile/addresses" className="text-sm text-brand-600 dark:text-brand-400 hover:underline self-center font-medium">
              + Add / edit addresses
            </Link>
            <Button onClick={() => addressId ? setStep(2) : setError("Please select a delivery address.")}>
              Continue to Delivery
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Delivery & Payment */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            <Card>
              <h2 className="font-semibold text-lg mb-3">Delivery Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["STANDARD", "EXPRESS"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setShippingMethod(m)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      shippingMethod === m
                        ? "border-brand-600 bg-brand-50 dark:bg-brand-950/30"
                        : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Truck className={`w-4 h-4 ${shippingMethod === m ? "text-brand-600" : "text-surface-400"}`} />
                      <p className="font-semibold text-sm">{m === "STANDARD" ? "Standard" : "Express"}</p>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">{m === "STANDARD" ? "3–5 business days" : "1–2 business days"}</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold text-lg mb-3">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("PHONEPE")}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                    paymentMethod === "PHONEPE"
                      ? "border-brand-600 bg-brand-50 dark:bg-brand-950/30"
                      : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className={`w-4 h-4 ${paymentMethod === "PHONEPE" ? "text-brand-600" : "text-surface-400"}`} />
                    <p className="font-semibold text-sm">PhonePe</p>
                  </div>
                  <p className="text-xs text-surface-500 mt-1">UPI / Cards / Netbanking</p>
                </button>
                <button
                  onClick={() => setPaymentMethod("COD")}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                    paymentMethod === "COD"
                      ? "border-brand-600 bg-brand-50 dark:bg-brand-950/30"
                      : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Banknote className={`w-4 h-4 ${paymentMethod === "COD" ? "text-brand-600" : "text-surface-400"}`} />
                    <p className="font-semibold text-sm">Cash on Delivery</p>
                  </div>
                  <p className="text-xs text-surface-500 mt-1">Pay at your doorstep</p>
                </button>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Coupon (optional)</label>
                <Input
                  value={coupon}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                  className="uppercase font-mono mt-1.5"
                />
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold mb-2">Ready to review?</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-4 leading-relaxed">
              We revalidate prices, stock, coupon and delivery on the server before you pay. Never trust client totals.
            </p>
            <Button className="w-full" onClick={revalidate} isLoading={quoting} size="lg">
              Review Order
            </Button>
            <Button variant="ghost" className="w-full mt-2" onClick={() => setStep(1)}>Back</Button>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && quote && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Card>
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            <div className="space-y-3">
              {quote.items.map((it: any) => (
                <div key={it.sku} className="flex gap-3 items-center">
                  <Image src={it.image || "https://via.placeholder.com/80x80"} alt={it.name} width={64} height={64} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover bg-surface-100" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{it.name}</p>
                    <p className="text-xs text-surface-500 font-mono">{it.sku} × {it.quantity}</p>
                  </div>
                  <p className="font-semibold text-sm shrink-0">{formatPrice(it.lineTotal)}</p>
                </div>
              ))}
            </div>
            {quote.issues?.length > 0 && (
              <div className="mt-4 space-y-2">
                {quote.issues.map((iss: any, i: number) => (
                  <p key={i} className="text-sm text-warning-700 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg p-2">{iss.message}</p>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">Subtotal</span><span className="font-medium">{formatPrice(quote.pricing.subtotal)}</span></div>
              {quote.pricing.couponDiscount > 0 && (
                <div className="flex justify-between text-accent-600"><span className="font-medium">Coupon ({quote.pricing.couponCode})</span><span className="font-semibold">−{formatPrice(quote.pricing.couponDiscount)}</span></div>
              )}
              {(quote.pricing.offerDiscount || 0) > 0 && (
                <div className="flex justify-between text-accent-600"><span className="font-medium">Offer ({quote.pricing.offerTitle || "Offer"})</span><span className="font-semibold">−{formatPrice(quote.pricing.offerDiscount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-surface-500">Shipping ({shippingMethod})</span><span className="font-medium">{quote.selectedShipping.fee === 0 ? <span className="text-accent-600 font-semibold">FREE</span> : formatPrice(quote.selectedShipping.fee)}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Tax</span><span className="font-medium">{formatPrice(quote.pricing.taxTotal)}</span></div>
              {quote.pricing.codFee > 0 && <div className="flex justify-between"><span className="text-surface-500">COD fee</span><span className="font-medium">{formatPrice(quote.pricing.codFee)}</span></div>}
              <div className="border-t border-surface-200 dark:border-surface-700 pt-3 flex justify-between">
                <span className="font-bold text-base">Total</span>
                <span className="font-bold text-lg price">{formatPrice(quote.pricing.subtotal - quote.pricing.couponDiscount - (quote.pricing.offerDiscount || 0) + quote.selectedShipping.fee + quote.pricing.codFee + quote.pricing.taxTotal)}</span>
              </div>
            </div>
            <Button className="w-full mt-5" size="lg" onClick={placeOrder} isLoading={placing} disabled={placing}>
              {placing ? "Placing order..." : paymentMethod === "COD" ? "Place Order (COD)" : "Place Order & Pay"}
            </Button>
            <p className="text-[11px] text-surface-400 text-center mt-2">Button disables while processing to prevent duplicate payments.</p>
            <Button variant="ghost" className="w-full mt-2" onClick={() => setStep(2)} disabled={placing}>Back</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
