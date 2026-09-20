import { getSessionFromCookie } from "@/lib/auth-server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { redirect } from "next/navigation";
import AccountClient from "./AccountClient";

export default async function AccountPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).lean();

  if (!user) redirect("/login");

  const data = {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "USER",
  };

  return <AccountClient user={data} />;
}
