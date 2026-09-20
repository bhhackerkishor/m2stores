export type ProviderType = "PHONEPE" | "COD";

export interface CreatePaymentInput {
  orderId: string; // Order _id (hex)
  amount: number; // rupees
  currency?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface PaymentInitiationResult {
  paymentId: string;
  providerPaymentId: string; // merchantTransactionId
  redirectUrl?: string;
  status: string;
}

export interface VerifyPaymentInput {
  paymentId: string;
  orderId: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: string;
  transactionId?: string;
  amount: number;
}

export interface WebhookResult {
  success: boolean;
  orderStatusUpdate: boolean;
  paymentStatus: string;
  merchantTransactionId?: string;
}

export interface RefundInput {
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
  amount: number;
}

export interface PaymentStatusResult {
  status: "PAID" | "FAILED" | "PENDING" | "CANCELLED";
  amount: number;
  providerTransactionId?: string;
  raw?: unknown;
}

export abstract class PaymentProvider {
  abstract readonly name: ProviderType;
  abstract createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult>;
  abstract verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult>;
  abstract handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult>;
  abstract refundPayment(input: RefundInput): Promise<RefundResult>;
  abstract getPaymentStatus(merchantTransactionId: string): Promise<PaymentStatusResult>;
}
