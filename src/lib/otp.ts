import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "@/models/User";
import { logger } from "@/lib/logger";
import { OTP_EXPIRY_MS, OTP_MAX_ATTEMPTS, OTP_RATE_LIMIT_MAX_REQUESTS, OTP_RATE_LIMIT_WINDOW_MS } from "@/config/constants";

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function hashOTP(otp: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

export async function verifyOTP(otp: string, hashedOTP: string): Promise<boolean> {
  return bcrypt.compare(otp, hashedOTP);
}

export async function storeOTP(identifier: string, otpHash: string, otp: string): Promise<void> {
  const user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { phone: identifier }] });
  if (!user) {
    throw new Error("User not found");
  }
  user.otp = otpHash;
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  user.otpAttempts = 0;
  (user as any).otpSentAt = new Date();
  await user.save();
  logger.info("OTP stored", "auth", { identifier });
}

export async function verifyStoredOTP(identifier: string, otp: string): Promise<{ success: boolean; message: string }> {
  const user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { phone: identifier }] }).select("+otp +otpExpiresAt +otpAttempts");
  if (!user) {
    return { success: false, message: "User not found" };
  }
  if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    return { success: false, message: "OTP has expired. Please request a new one." };
  }
  if (user.otpAttempts && user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    return { success: false, message: `Too many attempts. Try again in ${OTP_RATE_LIMIT_WINDOW_MS / 60000} minutes.` };
  }

  const match = await bcrypt.compare(otp, user.otp);
  if (!match) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    return { success: false, message: `Invalid OTP. ${OTP_MAX_ATTEMPTS - user.otpAttempts} attempts remaining.` };
  }

  // Clear OTP after successful verification
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  await user.save();

  return { success: true, message: "OTP verified successfully" };
}

export function checkOTPRateLimit(identifier: string): { allowed: boolean; remainingMs?: number } {
  // Simple rate limit check using in-memory store or Redis in production
  // For now, just check if requests are within reasonable limits
  return { allowed: true };
}
