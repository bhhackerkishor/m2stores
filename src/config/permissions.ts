export const ROLES = ["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"] as const;

export const PERMISSIONS = {
  products: ["products.read", "products.write", "products.delete", "products.duplicate"],
  categories: ["categories.read", "categories.write", "categories.delete"],
  brands: ["brands.read", "brands.write", "brands.delete"],
  inventory: ["inventory.read", "inventory.write", "inventory.adjust"],
  orders: ["orders.read", "orders.write", "orders.cancel", "orders.status.update"],
  payments: ["payments.read", "refunds.trigger", "refunds.read"],
  customers: ["customers.read", "customers.write"],
  coupons: ["coupons.read", "coupons.write", "coupons.delete"],
  offers: ["offers.read", "offers.write"],
  reviews: ["reviews.read", "reviews.write", "reviews.moderate"],
  returns: ["returns.read", "returns.write", "refunds.process"],
  shipping: ["shipping.read", "shipping.write"],
  banners: ["banners.read", "banners.write"],
  homepage: ["homepage.read", "homepage.write"],
  notifications: ["notifications.read"],
  support: ["support.read", "support.write"],
  reports: ["reports.read", "reports.export"],
  analytics: ["analytics.read"],
  settings: ["settings.read", "settings.write"],
  admins: ["admins.read", "admins.write", "admins.permissions"],
  audit: ["audit.read"],
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][number];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  CUSTOMER: [
    "products.read", "categories.read", "brands.read",
    "orders.read", "customers.read",
    "reviews.write", "support.write",
  ],
  STAFF: [
    "products.read", "categories.read", "brands.read",
    "orders.read", "orders.write", "orders.status.update",
    "customers.read", "support.write",
    "inventory.read", "reviews.read",
  ],
  ADMIN: [
    "products.read", "products.write", "products.delete", "products.duplicate",
    "categories.read", "categories.write", "categories.delete",
    "brands.read", "brands.write", "brands.delete",
    "orders.read", "orders.write", "orders.cancel", "orders.status.update",
    "payments.read", "refunds.trigger", "refunds.read",
    "customers.read", "customers.write",
    "coupons.read", "coupons.write", "coupons.delete",
    "offers.read", "offers.write",
    "reviews.read", "reviews.moderate",
    "returns.read", "returns.write", "refunds.process",
    "shipping.read", "shipping.write",
    "banners.read", "banners.write",
    "homepage.read", "homepage.write",
    "notifications.read",
    "support.read", "support.write",
    "reports.read", "reports.export",
    "analytics.read",
    "settings.read", "settings.write",
    "inventory.read", "inventory.write", "inventory.adjust",
  ],
  SUPER_ADMIN: [
    ...Object.values(PERMISSIONS).flat(),
  ],
};

export function hasPermission(userRole: string, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
