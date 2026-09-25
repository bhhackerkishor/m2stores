import { connectDB } from "@/lib/db";
import { Setting } from "@/models/Setting";
import { Order } from "@/models/Order";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type PincodeMode = "all" | "allowlist" | "blocklist";

export interface PincodeRuleResult {
  ok: boolean;
  reason?: string;
}

/**
 * Shared pincode gate used by delivery serviceability + COD checks.
 * - mode "all": everything passes (default)
 * - mode "allowlist": pass only exact pincodes or 3-digit prefixes listed
 * - mode "blocklist": pass everything except blocked exact pincodes/prefixes
 * Mode defaults are inferred from stored lists when the explicit field is absent.
 */
export function matchPincodeRule(
  pincode: string,
  mode: string | undefined,
  allowed: string[] | undefined,
  allowedPrefixes: string[] | undefined,
  blocked: string[] | undefined,
  label = "This"
): PincodeRuleResult {
  const allow = (allowed || []).filter(Boolean);
  const prefixes = (allowedPrefixes || []).filter(Boolean);
  const block = (blocked || []).filter(Boolean);
  const effective: PincodeMode =
    mode === "all" || mode === "allowlist" || mode === "blocklist"
      ? mode
      : block.length > 0
        ? "blocklist"
        : allow.length > 0 || prefixes.length > 0
          ? "allowlist"
          : "all";

  if (effective === "all") return { ok: true };
  if (!pincode) return { ok: true }; // no pincode known yet — don't block; server rechecks with real address

  if (effective === "blocklist") {
    // Only the explicit blocked list applies — allowed prefixes are a
    // leftover of allowlist config and must NOT flip into blocks.
    if (block.includes(pincode)) return { ok: false, reason: `${label} is not available for pincode ${pincode}` };
    return { ok: true };
  }

  // allowlist
  if (allow.includes(pincode)) return { ok: true };
  if (prefixes.some((p) => pincode.startsWith(p))) return { ok: true };
  return { ok: false, reason: `${label} is not available for pincode ${pincode}` };
}

export type ShippingMethod = "STANDARD" | "EXPRESS";

export interface ShipmentInput {
  courier?: string;
  trackingNumber: string;
  provider?: string;
  fee?: number;
}

export interface ShippingProvider {
  readonly name: string;
  createShipment(orderNumber: string, input: ShipmentInput): Promise<{ shipmentId: string; trackingUrl?: string }>;
  track(trackingNumber: string): Promise<Array<{ status: string; location?: string; timestamp: Date }>>;
}

class ManualShippingProvider implements ShippingProvider {
  readonly name = "MANUAL";
  async createShipment(orderNumber: string, input: ShipmentInput) {
    const shipmentId = `SHP_${orderNumber}_${Date.now().toString(36).toUpperCase()}`;
    return { shipmentId };
  }
  async track(_trackingNumber: string) {
    return [];
  }
}

export function getShippingProvider(name?: string): ShippingProvider {
  void name;
  return new ManualShippingProvider();
}

export interface ShippingOption {
  method: ShippingMethod;
  label: string;
  fee: number;
  etaDays: [number, number];
  estimatedDelivery: string;
}

export class ShippingService {
  static async getSettings() {
    await connectDB();
    let s: any = await Setting.findOne().lean();
    if (!s) {
      s = {
        shippingFlatRate: 0,
        freeShippingThreshold: 499,
        freeShippingEnabled: true,
        expressFee: 99,
        isCODEnabled: true,
        codMinOrderValue: 0,
        codMaxOrderValue: 50000,
        codFee: 0,
        codAllowedPincodes: [],
      };
    }
    return s;
  }

  static eta(method: ShippingMethod): { etaDays: [number, number]; estimatedDelivery: string } {
    const days: [number, number] = method === "EXPRESS" ? [1, 2] : [3, 5];
    const d = new Date();
    d.setDate(d.getDate() + days[1]);
    return { etaDays: days, estimatedDelivery: d.toISOString() };
  }

  static async options(subtotal: number, method: ShippingMethod = "STANDARD"): Promise<ShippingOption[]> {
    const s = await this.getSettings();
    const flat: number = s.shippingFlatRate ?? 0;
    const threshold = s.freeShippingThreshold ?? 499;
    const freeEnabled = s.freeShippingEnabled !== false;
    const standardFee = (freeEnabled && subtotal >= threshold) || subtotal === 0 ? 0 : flat;
    const express = s.expressFee ?? 99;
    const list: ShippingOption[] = [
      { method: "STANDARD", label: "Standard Delivery", fee: standardFee, ...this.eta("STANDARD") },
      { method: "EXPRESS", label: "Express Delivery", fee: express, ...this.eta("EXPRESS") },
    ];
    return list;
  }

  static async feeFor(subtotal: number, method: ShippingMethod): Promise<number> {
    const opts = await this.options(subtotal, method);
    return opts.find((o) => o.method === method)?.fee || 0;
  }

  static async checkCOD(subtotal: number, pincode: string): Promise<{ eligible: boolean; reason?: string; fee: number }> {
    const s = await this.getSettings();
    if (!s.isCODEnabled) return { eligible: false, reason: "COD is currently disabled", fee: 0 };
    if (subtotal < (s.codMinOrderValue ?? 0)) return { eligible: false, reason: `COD requires minimum order of ₹${s.codMinOrderValue}`, fee: 0 };
    if (subtotal > (s.codMaxOrderValue ?? 50000)) return { eligible: false, reason: `COD not available above ₹${s.codMaxOrderValue}`, fee: 0 };
    const match = matchPincodeRule(
      pincode,
      s.codPincodeMode,
      s.codAllowedPincodes,
      s.codAllowedPrefixes,
      s.codBlockedPincodes,
      "COD"
    );
    if (!match.ok) return { eligible: false, reason: match.reason || `COD not available for pincode ${pincode}`, fee: 0 };
    return { eligible: true, fee: s.codFee ?? 0 };
  }

  /** Is this pincode serviceable for delivery at all? */
  static async checkDelivery(pincode: string): Promise<{ deliverable: boolean; reason?: string }> {
    const s = await this.getSettings();
    const match = matchPincodeRule(
      pincode,
      s.deliveryPincodeMode,
      s.deliveryAllowedPincodes,
      s.deliveryAllowedPrefixes,
      s.deliveryBlockedPincodes,
      "Delivery"
    );
    return { deliverable: match.ok, reason: match.reason };
  }

  static async createShipment(orderNumber: string, input: ShipmentInput, actorId?: string) {
    await connectDB();
    if (!input.trackingNumber?.trim()) throw new AppError("Tracking number is required", 400, "TRACKING_REQUIRED");
    const order: any = await Order.findOne({ orderNumber });
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    const provider = getShippingProvider();
    const { shipmentId } = await provider.createShipment(orderNumber, input);
    order.shippingDetails = {
      ...(order.shippingDetails || {}),
      provider: provider.name,
      shipmentId,
      courier: input.courier || order.shippingDetails?.courier || "Manual",
      trackingNumber: input.trackingNumber.trim(),
      fee: input.fee ?? order.shippingDetails?.fee ?? order.pricingSnapshot?.shippingFee ?? 0,
      shippedAt: order.shippingDetails?.shippedAt || new Date(),
      events: [
        ...((order.shippingDetails?.events as any[]) || []),
        { status: "SHIPPED", location: input.courier || "Warehouse", timestamp: new Date(), note: `Shipment ${shipmentId} created${actorId ? ` by ${actorId}` : ""}` },
      ],
    };
    await order.save();
    logger.info("Shipment created", "shipping", { orderNumber, shipmentId });
    return order.shippingDetails;
  }

  static async addTrackingEvent(orderNumber: string, event: { status: string; location?: string; note?: string }) {
    await connectDB();
    if (!event.status?.trim()) throw new AppError("Event status is required", 400, "VALIDATION_ERROR");
    const order: any = await Order.findOne({ orderNumber });
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    order.shippingDetails = {
      ...(order.shippingDetails || {}),
      events: [
        ...((order.shippingDetails?.events as any[]) || []),
        { status: event.status.trim().toUpperCase(), location: event.location, timestamp: new Date(), note: event.note },
      ],
    };
    await order.save();
    return order.shippingDetails;
  }
}
