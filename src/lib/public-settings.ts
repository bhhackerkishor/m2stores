import { connectDB } from "@/lib/db";
import { Setting, type ISetting } from "@/models/Setting";

export interface PublicSettings {
  deliveryDays: number;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  await connectDB();
  const s = await Setting.findOne().lean() as Pick<ISetting, "codDaysCal"> | null;
  return {
    deliveryDays: s?.codDaysCal ?? 3,
  };
}
