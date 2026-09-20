import { connectDB } from "@/lib/db";
import { Offer } from "@/models/Offer";
import type { PricedLine } from "./pricing.service";

export interface OfferResult {
  offerId?: string;
  offerTitle?: string;
  discount: number;
  freeShipping: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

function inScope(offer: any, line: PricedLine): boolean {
  const hasScope =
    (offer.applicableCategoryIds?.length || 0) > 0 ||
    (offer.applicableProductIds?.length || 0) > 0 ||
    (offer.applicableBrandIds?.length || 0) > 0;
  if (!hasScope) return true;
  const cats = new Set((offer.applicableCategoryIds || []).map(String));
  const prods = new Set((offer.applicableProductIds || []).map(String));
  const brands = new Set((offer.applicableBrandIds || []).map(String));
  return (
    (line.categoryId ? cats.has(line.categoryId) : false) ||
    prods.has(line.productId) ||
    (line.brandId ? brands.has(line.brandId) : false)
  );
}

export class OfferService {
  static async activeOffers(now = new Date()) {
    await connectDB();
    return Offer.find({ isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now } })
      .sort({ priority: -1, createdAt: -1 })
      .lean();
  }

  /**
   * Evaluate all active offers, apply the single best discount offer plus
   * free-shipping if any matching FREE_SHIPPING offer exists. Deterministic.
   */
  static async evaluate(lines: PricedLine[], subtotal: number): Promise<OfferResult> {
    const offers: any[] = await this.activeOffers();
    let best = { discount: 0, offerId: undefined as string | undefined, offerTitle: undefined as string | undefined };
    let freeShipping = false;

    for (const offer of offers) {
      if (subtotal < (offer.minOrderValue || 0)) continue;
      const eligible = lines.filter((l) => inScope(offer, l));
      if (eligible.length === 0) continue;

      if (offer.type === "FREE_SHIPPING") {
        freeShipping = true;
        continue;
      }
      if (offer.type === "PERCENTAGE") {
        const base = eligible.reduce((s, l) => s + l.lineTotal, 0);
        let d = (base * (offer.discountValue || 0)) / 100;
        if (offer.maxDiscountAmount) d = Math.min(d, offer.maxDiscountAmount);
        d = round(d);
        if (d > best.discount) best = { discount: d, offerId: String(offer._id), offerTitle: offer.title };
        continue;
      }
      if (offer.type === "BXGY") {
        const buy = offer.buyQty || 1;
        const get = offer.getQty || 1;
        const totalQty = eligible.reduce((s, l) => s + l.quantity, 0);
        const freeUnits = Math.floor(totalQty / buy) * get;
        if (freeUnits <= 0) continue;
        const cheapest = Math.min(...eligible.map((l) => l.unitPrice));
        const d = round(Math.min(freeUnits, totalQty) * cheapest);
        if (d > best.discount) best = { discount: d, offerId: String(offer._id), offerTitle: offer.title };
      }
    }

    return { ...best, freeShipping };
  }

  static async listAdmin() {
    await connectDB();
    return Offer.find().sort({ createdAt: -1 }).lean();
  }
}
