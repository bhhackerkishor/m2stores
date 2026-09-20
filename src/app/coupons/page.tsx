import { CouponService } from "@/services/coupon.service";
import { OfferService } from "@/services/offer.service";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Coupons & Offers | M2Stores",
  description: "Active coupons and promotional offers.",
};

export default async function CouponsPage() {
  const [coupons, offers] = await Promise.all([
    CouponService.publicList().catch(() => []),
    OfferService.activeOffers().catch(() => []),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Coupons & Offers</h1>
      <p className="text-surface-600 mb-8">Apply codes at cart or checkout. Offers apply automatically.</p>

      <h2 className="text-xl font-bold mb-4">Active Offers</h2>
      {(offers as any[]).length === 0 ? (
        <p className="text-sm text-surface-500 mb-8">No live offers right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {(offers as any[]).map((o) => (
            <Card key={String(o._id)}>
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700">{o.type.replace("_", " ")}</p>
              <h3 className="font-bold text-lg mt-1">{o.title}</h3>
              {o.description && <p className="text-sm text-surface-600 mt-1">{o.description}</p>}
              <p className="text-xs text-surface-500 mt-2">
                {o.type === "PERCENTAGE" && `${o.discountValue}% off${o.maxDiscountAmount ? ` up to ${formatPrice(o.maxDiscountAmount)}` : ""}`}
                {o.type === "FREE_SHIPPING" && "Free shipping"}
                {o.type === "BXGY" && `Buy ${o.buyQty}, get ${o.getQty} free`}
                {(o.minOrderValue || 0) > 0 && ` · min ${formatPrice(o.minOrderValue)}`}
              </p>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Coupon Codes</h2>
      {(coupons as any[]).length === 0 ? (
        <Card className="p-8 text-center text-surface-500 text-sm">No active coupons right now.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(coupons as any[]).map((c) => (
            <Card key={c.code}>
              <p className="font-mono font-bold text-lg text-blue-700">{c.code}</p>
              <p className="text-sm mt-1">
                {c.discountType === "PERCENTAGE" ? `${c.discountValue}% off` : `${formatPrice(c.discountValue)} off`}
                {c.maxDiscountAmount ? ` up to ${formatPrice(c.maxDiscountAmount)}` : ""}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {c.minOrderValue > 0 && `Min ${formatPrice(c.minOrderValue)} · `}
                {c.isFirstOrderOnly ? "First orders only · " : ""}
                Valid till {new Date(c.expiryDate).toLocaleDateString("en-IN")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
