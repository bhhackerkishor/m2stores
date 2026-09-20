import { z } from "zod";

const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;
const pinRegex = /^\d{6}$/;

export const createAddressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(phoneRegex, "Invalid Indian phone number"),
  addressLine1: z.string().trim().min(5).max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  landmark: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().regex(pinRegex, "Invalid Indian PIN code"),
  country: z.string().trim().default("India"),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();
