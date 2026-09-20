import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";
import { logger } from "@/lib/logger";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = process.env.COOKIE_NAME || "m2s_token";

export async function getSessionFromCookie(): Promise<{ userId: string; role: string; permissions: string[] } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; permissions: string[]; sessionVersion: number };
    await connectDB();

    const user = await User.findById(decoded.userId).select("+sessionVersion");
    if (!user || user.sessionVersion !== decoded.sessionVersion) return null;

    return { userId: decoded.userId, role: decoded.role, permissions: decoded.permissions };
  } catch {
    return null;
  }
}

export async function invalidateSession(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $inc: { sessionVersion: 1 } });
  logger.info("Session invalidated", "auth", { userId });
}

export async function requirePermission(permission: string): Promise<{ userId: string; role: string; permissions: string[] }> {
  const { hasPermission } = await import("@/config/permissions");
  const { AppError } = await import("@/lib/errors");
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) throw new AppError("Login required", 401, "UNAUTHORIZED");
  if (!hasPermission(session.role, permission as any) && !session.permissions?.includes(permission)) {
    throw new AppError("You do not have permission to perform this action", 403, "FORBIDDEN");
  }
  return session;
}
