import { getSessionFromCookie } from "@/lib/auth-server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { redirect } from "next/navigation";
import ProfileClientHub from "./ProfileClientHub";

export default async function ProfilePage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  await connectDB();
  const rawUser = await User.findById(session.userId).select("-passwordHash -otp -otpExpiresAt").lean();

  if (!rawUser) redirect("/login");

  const user = {
    id: rawUser._id.toString(),
    name: rawUser.name || "",
    email: rawUser.email || "",
    phone: rawUser.phone || "",
    role: rawUser.role || "USER",
    createdAt: rawUser.createdAt?.toISOString() || new Date().toISOString(),
  };

  return <ProfileClientHub user={user} />;
}
