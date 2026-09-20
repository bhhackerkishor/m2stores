import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  // MongoDB
  try {
    await connectDB();
    if (mongoose.connection.readyState === 1) {
      checks.mongodb = "connected";
    } else {
      checks.mongodb = "disconnected";
      healthy = false;
    }
  } catch {
    checks.mongodb = "error";
    healthy = false;
  }

  // Environment
  checks.nodeEnv = process.env.NODE_ENV || "development";
  checks.uptime = `${Math.floor(process.uptime())}s`;

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
