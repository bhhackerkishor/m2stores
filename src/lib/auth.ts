import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = process.env.COOKIE_NAME || "m2s_token";

export function generateToken(payload: { userId: string; role: string; permissions: string[]; sessionVersion: number }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function getCookieName(): string {
  return COOKIE_NAME;
}
