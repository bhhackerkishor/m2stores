import type { NotificationEvent } from "@/models/Notification";

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

export interface SmsPayload {
  to: string;
  text: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<{ sent: boolean; id?: string }>;
}

export interface SmsProvider {
  send(payload: SmsPayload): Promise<{ sent: boolean; id?: string }>;
}

/** Dev/default: logs instead of spending SMS/email budget. Swap via env later. */
class ConsoleEmailProvider implements EmailProvider {
  async send(payload: EmailPayload) {
    console.log(`📧 [email] to=${payload.to} subject=${payload.subject}`);
    return { sent: true, id: `log-${Date.now()}` };
  }
}

class ConsoleSmsProvider implements SmsProvider {
  async send(payload: SmsPayload) {
    console.log(`📱 [sms] to=${payload.to} text=${payload.text.slice(0, 80)}`);
    return { sent: true, id: `log-${Date.now()}` };
  }
}

export function getEmailProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}

export function getSmsProvider(): SmsProvider {
  return new ConsoleSmsProvider();
}

export const NOTIFICATION_TEMPLATES: Record<NotificationEvent, (ctx: Record<string, any>) => { title: string; body: string }> = {
  ORDER_CONFIRMED: (c) => ({ title: `Order ${c.orderNumber} confirmed`, body: `Thanks! Your order ${c.orderNumber} (${c.total}) is confirmed.` }),
  PAYMENT_SUCCESS: (c) => ({ title: `Payment received for ${c.orderNumber}`, body: `We received ${c.total} for order ${c.orderNumber}.` }),
  PAYMENT_FAILED: (c) => ({ title: `Payment failed for ${c.orderNumber}`, body: `Your payment for ${c.orderNumber} failed. Please retry — stock is reserved briefly.` }),
  ORDER_PACKED: (c) => ({ title: `Order ${c.orderNumber} packed`, body: `Your order is packed and will ship soon.` }),
  ORDER_SHIPPED: (c) => ({ title: `Order ${c.orderNumber} shipped`, body: `Tracking: ${c.tracking || "available in your orders"}.` }),
  OUT_FOR_DELIVERY: (c) => ({ title: `Out for delivery: ${c.orderNumber}`, body: `Your package arrives today.` }),
  DELIVERED: (c) => ({ title: `Delivered: ${c.orderNumber}`, body: `Enjoy! Please rate your products.` }),
  ORDER_CANCELLED: (c) => ({ title: `Order ${c.orderNumber} cancelled`, body: `Cancelled${c.refund ? " — refund initiated" : ""}.` }),
  RETURN_UPDATE: (c) => ({ title: `Return update: ${c.orderNumber}`, body: c.message || "Your return status changed." }),
  REFUND_COMPLETED: (c) => ({ title: `Refund completed: ${c.orderNumber}`, body: `₹${c.amount} refunded to your source account.` }),
  SUPPORT_REPLY: (c) => ({ title: `Support replied: ${c.ticketNumber}`, body: `New reply on "${c.subject}".` }),
};
