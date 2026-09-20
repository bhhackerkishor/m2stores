export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = "The requested quantity is no longer available in stock") {
    super(message, 409, "INSUFFICIENT_STOCK");
  }
}

export class PaymentVerificationError extends AppError {
  constructor(message = "Payment verification failed or signature mismatch") {
    super(message, 400, "PAYMENT_VERIFICATION_FAILED");
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Cannot transition order status from '${from}' to '${to}'`, 400, "INVALID_STATE_TRANSITION");
  }
}
