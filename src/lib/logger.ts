type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };
    const sensitiveFields = ["password", "passwordHash", "otp", "otpHash", "salt", "cardNumber", "cvv", "token", "secret"];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }
    return sanitized;
  }

  public log(level: LogLevel, message: string, context?: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata: metadata ? this.sanitize(metadata) : undefined,
    };
    if (level === "warn") console.warn(this.format(entry));
    else if (level === "error") console.error(this.format(entry));
    else console.log(this.format(entry));
  }

  public info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, context, metadata);
  }

  public warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, context, metadata);
  }

  public error(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log("error", message, context, metadata);
  }
}

export const logger = new Logger();
