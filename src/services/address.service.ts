import { connectDB } from "@/lib/db";
import { Address } from "@/models/Address";
import { AppError } from "@/lib/errors";

export class AddressService {
  static async list(userId: string) {
    await connectDB();
    return Address.find({ userId }).sort({ isDefault: -1, updatedAt: -1 }).lean();
  }

  static async get(userId: string, id: string) {
    await connectDB();
    const addr: any = await Address.findOne({ _id: id, userId }).lean();
    if (!addr) throw new AppError("Address not found", 404, "NOT_FOUND");
    return addr;
  }

  static async create(userId: string, data: any) {
    await connectDB();
    const count = await Address.countDocuments({ userId });
    const isDefault = count === 0 ? true : Boolean(data.isDefault);
    if (isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }
    const addr = await Address.create({ ...data, userId, isDefault });
    return addr.toObject();
  }

  static async update(userId: string, id: string, data: any) {
    await connectDB();
    if (data.isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }
    const addr = await Address.findOneAndUpdate({ _id: id, userId }, { $set: data }, { new: true }).lean() as any;
    if (!addr) throw new AppError("Address not found", 404, "NOT_FOUND");
    return addr;
  }

  static async remove(userId: string, id: string) {
    await connectDB();
    const addr: any = await Address.findOne({ _id: id, userId }).lean();
    if (!addr) throw new AppError("Address not found", 404, "NOT_FOUND");
    await Address.deleteOne({ _id: id, userId });
    if (addr.isDefault) {
      const next = await Address.findOne({ userId }).sort({ updatedAt: -1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }
    return { deleted: true };
  }

  static async setDefault(userId: string, id: string) {
    await connectDB();
    const addr = await Address.findOne({ _id: id, userId });
    if (!addr) throw new AppError("Address not found", 404, "NOT_FOUND");
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
    addr.isDefault = true;
    await addr.save();
    return addr.toObject();
  }
}
