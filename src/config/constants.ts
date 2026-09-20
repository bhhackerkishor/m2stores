export const APP_NAME = "M2Stores";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const CURRENCY_SYMBOL = "₹";
export const CURRENCY_CODE = "INR";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
} as const;

export const PASSWORD_RESET_TIMEOUT = 3600000;
export const OTP_EXPIRY_MS = 300000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RATE_LIMIT_WINDOW_MS = 600000;
export const OTP_RATE_LIMIT_MAX_REQUESTS = 3;

export const CART_EXPIRY_DAYS = 30;
export const INVENTORY_RESERVATION_EXPIRY_MS = 3600000;

export const ADMIN_PREFIX = "/admin";
export const STOREFRONT_PREFIX = "";

export const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ADDRESS_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh",
  "Puducherry", "Jammu and Kashmir", "Ladakh", "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli", "Daman and Diu", "Lakshadweep", "Haryana",
] as const;

export const PINCODE_REGEX = /^\d{6}$/;
export const PHONE_REGEX = /^\+91[-\s]?\d{10}$|^[6-9]\d{9}$/;
