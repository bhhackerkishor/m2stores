import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.entries(envConfig).forEach(([key, value]) => {
    if (!(key in process.env)) {
      process.env[key] = value as string;
    }
  });
}

import { User } from "../models/User";
import { Category } from "../models/Category";
import { Brand } from "../models/Brand";
import { Product } from "../models/Product";
import { InventoryState } from "../models/Inventory";
import { Coupon } from "../models/Coupon";
import { Banner } from "../models/Banner";
import { Setting } from "../models/Setting";
import { HomepageConfig } from "../models/HomepageConfig";

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    console.log("🗑️  Cleared database");

    // Create Super Admin
    const passwordHash = await bcrypt.hash("Admin@M2Stores2026!", 12);
    await User.create({
      name: process.env.ADMIN_NAME || "M2Stores SuperAdmin",
      email: process.env.ADMIN_EMAIL || "admin@m2stores.com",
      phone: process.env.ADMIN_PHONE || "9876543210",
      passwordHash,
      role: "SUPER_ADMIN",
      permissions: [
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
        "admins.read", "admins.write", "admins.permissions",
        "audit.read",
      ],
      isPhoneVerified: true,
      isEmailVerified: true,
      status: "ACTIVE",
      sessionVersion: 1,
    });
    console.log("✅ Created Super Admin");

    // Create Categories (with hierarchy + filterable attributes per vertical)
    const filterable = (attrs: Array<{ name: string; type: "TEXT" | "SELECT" | "NUMBER"; options?: string[] }>) =>
      attrs.map((a) => ({ name: a.name, type: a.type, options: a.options || [], isFilterable: true }));
    const categories = await Category.insertMany([
      { name: "Electronics", slug: "electronics", description: "Electronics, gadgets, and accessories", level: 0, isActive: true, sortOrder: 1, attributes: filterable([{ name: "color", type: "SELECT", options: ["Black", "White", "Blue"] }, { name: "storage", type: "SELECT", options: ["128GB", "256GB", "512GB"] }, { name: "ram", type: "SELECT", options: ["8GB", "12GB", "18GB", "36GB"] }]) },
      { name: "Mobile Phones", slug: "mobile-phones", description: "Smartphones and accessories", level: 1, parentCategoryId: null, isActive: true, sortOrder: 2, attributes: filterable([{ name: "color", type: "SELECT", options: ["Black", "White", "Blue"] }, { name: "storage", type: "SELECT", options: ["128GB", "256GB", "512GB"] }, { name: "ram", type: "SELECT", options: ["8GB", "12GB"] }]) },
      { name: "Laptops & PCs", slug: "laptops-pcs", description: "Laptops, desktops, and peripherals", level: 1, parentCategoryId: null, isActive: true, sortOrder: 3, attributes: filterable([{ name: "ram", type: "SELECT", options: ["18GB", "36GB"] }, { name: "storage", type: "SELECT", options: ["256GB", "512GB"] }]) },
      { name: "Fashion", slug: "fashion", description: "Clothing, footwear, and accessories", level: 0, isActive: true, sortOrder: 4, attributes: filterable([{ name: "color", type: "SELECT", options: ["Black", "White", "Red"] }, { name: "size", type: "SELECT", options: ["42", "43", "44"] }]) },
      { name: "Men's Fashion", slug: "mens-fashion", description: "Men's clothing and accessories", level: 1, parentCategoryId: null, isActive: true, sortOrder: 5, attributes: filterable([{ name: "color", type: "SELECT", options: ["Black", "White", "Red"] }, { name: "size", type: "SELECT", options: ["42", "43", "44"] }]) },
      { name: "Women's Fashion", slug: "womens-fashion", description: "Women's clothing and accessories", level: 1, parentCategoryId: null, isActive: true, sortOrder: 6, attributes: filterable([{ name: "color", type: "SELECT", options: ["Black", "White", "Red"] }, { name: "size", type: "SELECT", options: ["42", "43", "44"] }]) },
      { name: "Home & Living", slug: "home-living", description: "Home décor, kitchen, and furniture", level: 0, isActive: true, sortOrder: 7 },
      { name: "Beauty & Personal Care", slug: "beauty", description: "Skincare, makeup, and grooming", level: 0, isActive: true, sortOrder: 8 },
      { name: "Groceries & Essentials", slug: "groceries", description: "Groceries, snacks, and daily essentials", level: 0, isActive: true, sortOrder: 9 },
      { name: "Books", slug: "books", description: "Books, stationery, and educational materials", level: 0, isActive: true, sortOrder: 10 },
      { name: "Sports & Outdoors", slug: "sports", description: "Sports equipment, fitness, and outdoor gear", level: 0, isActive: true, sortOrder: 11 },
    ]);
    console.log(`✅ Created ${categories.length} categories`);

    // Create Brands
    const brands = await Brand.insertMany([
      { name: "Samsung", slug: "samsung", isActive: true },
      { name: "Apple", slug: "apple", isActive: true },
      { name: "Nike", slug: "nike", isActive: true },
      { name: "Adidas", slug: "adidas", isActive: true },
      { name: "OnePlus", slug: "oneplus", isActive: true },
      { name: "Sony", slug: "sony", isActive: true },
      { name: "Levis", slug: "levis", isActive: true },
      { name: "Boat", slug: "boat", isActive: true },
      { name: "Realme", slug: "realme", isActive: true },
      { name: "Titan", slug: "titan", isActive: true },
    ]);
    console.log(`✅ Created ${brands.length} brands`);

    // Create Products with Variants
    const products = await Product.insertMany([
      {
        name: "Samsung Galaxy S24 Ultra",
        slug: "samsung-galaxy-s24-ultra",
        description: "Experience the ultimate smartphone with Samsung Galaxy S24 Ultra. Featuring a 200MP camera, S Pen integration, and the fastest processor for seamless multitasking.",
        shortDescription: "200MP camera, S Pen, Snapdragon 8 Gen 3",
        categoryId: categories[1]._id,
        brandId: brands[0]._id,
        images: [
          { url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800", publicId: "s24_1", isPrimary: true },
          { url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800", publicId: "s24_2", isPrimary: false },
        ],
        basePrice: 129999,
        salePrice: 114999,
        costPrice: 90000,
        taxRate: 18,
        hasVariants: true,
        baseSKU: "SAMS-S24U",
        variants: [
          { sku: "SAMS-S24U-12-BLK", attributes: { storage: "12GB", color: "Black" }, price: 129999, salePrice: 114999, isActive: true },
          { sku: "SAMS-S24U-12-WHT", attributes: { storage: "12GB", color: "White" }, price: 129999, salePrice: 114999, isActive: true },
          { sku: "SAMS-S24U-12-BLU", attributes: { storage: "12GB", color: "Blue" }, price: 129999, salePrice: 119999, isActive: true },
          { sku: "SAMS-S24U-16-BLK", attributes: { storage: "16GB", color: "Black" }, price: 139999, salePrice: 124999, isActive: true },
        ],
        specifications: [
          { group: "Display", key: "Size", value: "6.8 inches" },
          { group: "Display", key: "Resolution", value: "3120 x 1440" },
          { group: "Processor", key: "Chipset", value: "Snapdragon 8 Gen 3" },
          { group: "Battery", key: "Capacity", value: "5000 mAh" },
        ],
        tags: ["smartphone", "samsung", "android", "flagship"],
        status: "PUBLISHED",
        isFeatured: true,
        isTrending: true,
        isBestseller: true,
        returnPolicyDays: 7,
        seo: { metaTitle: "Samsung Galaxy S24 Ultra | M2Stores", metaDescription: "Buy Samsung Galaxy S24 Ultra with 200MP Camera", keywords: ["samsung", "galaxy", "s24"] },
      },
      {
        name: "Nike Air Max 270",
        slug: "nike-air-max-270",
        description: "The Nike Air Max 270 delivers big, soft ZoomX Air foam for a plush, comfortable ride. Perfect for everyday running and casual wear.",
        shortDescription: "ZoomX Air foam, breathable knit upper",
        categoryId: categories[4]._id,
        brandId: brands[2]._id,
        images: [
          { url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800", publicId: "nike_1", isPrimary: true },
          { url: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800", publicId: "nike_2", isPrimary: false },
        ],
        basePrice: 12990,
        salePrice: 9990,
        costPrice: 6500,
        taxRate: 18,
        hasVariants: true,
        baseSKU: "NK-AM270",
        variants: [
          { sku: "NK-AM270-42-BLK", attributes: { size: "42", color: "Black" }, price: 12990, salePrice: 9990, isActive: true },
          { sku: "NK-AM270-43-WHT", attributes: { size: "43", color: "White" }, price: 12990, salePrice: 9990, isActive: true },
          { sku: "NK-AM270-44-RD", attributes: { size: "44", color: "Red" }, price: 12990, salePrice: 9990, isActive: true },
        ],
        specifications: [
          { group: "Sole", key: "Material", value: "Rubber" },
          { group: "Upper", key: "Material", value: "Knit" },
          { group: "Fit", key: "Type", value: "Regular" },
        ],
        tags: ["shoes", "nike", "running", "casual"],
        status: "PUBLISHED",
        isFeatured: true,
        isBestseller: true,
        returnPolicyDays: 7,
        seo: { metaTitle: "Nike Air Max 270 | M2Stores", metaDescription: "Buy Nike Air Max 270 Running Shoes", keywords: ["nike", "shoes", "running"] },
      },
      {
        name: "Apple MacBook Pro 14-inch M3 Pro",
        slug: "apple-macbook-pro-14-m3-pro",
        description: "Supercharged by M3 Pro chip, MacBook Pro 14-inch delivers transformative performance for professionals. Featuring a Liquid Retina XDR display.",
        shortDescription: "M3 Pro chip, 14-inch Liquid Retina XDR, 18GB RAM",
        categoryId: categories[2]._id,
        brandId: brands[1]._id,
        images: [
          { url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800", publicId: "mbp_1", isPrimary: true },
        ],
        basePrice: 199900,
        salePrice: 184900,
        costPrice: 145000,
        taxRate: 18,
        hasVariants: true,
        baseSKU: "APL-MBP14",
        variants: [
          { sku: "APL-MBP14-18-256", attributes: { ram: "18GB", storage: "256GB" }, price: 199900, salePrice: 184900, isActive: true },
          { sku: "APL-MBP14-18-512", attributes: { ram: "18GB", storage: "512GB" }, price: 214900, salePrice: 199900, isActive: true },
          { sku: "APL-MBP14-36-512", attributes: { ram: "36GB", storage: "512GB" }, price: 234900, salePrice: 219900, isActive: true },
        ],
        specifications: [
          { group: "Processor", key: "Chip", value: "Apple M3 Pro" },
          { group: "Memory", key: "RAM", value: "18GB Unified" },
          { group: "Display", key: "Size", value: "14.2 inches" },
          { group: "Battery", key: "Life", value: "18 hours" },
        ],
        tags: ["laptop", "apple", "macbook", "pro"],
        status: "PUBLISHED",
        isFeatured: true,
        isTrending: true,
        returnPolicyDays: 7,
        seo: { metaTitle: "Apple MacBook Pro 14 M3 Pro | M2Stores", metaDescription: "Buy Apple MacBook Pro 14-inch with M3 Pro chip", keywords: ["apple", "macbook", "laptop"] },
      },
      {
        name: "OnePlus Nord 3",
        slug: "oneplus-nord-3",
        description: "OnePlus Nord 3 features a 1.5K AMOLED display with 120Hz refresh rate and a powerful Snapdragon 8 Gen 2 chipset for smooth performance.",
        shortDescription: "1.5K AMOLED, Snapdragon 8 Gen 2, 50MP Camera",
        categoryId: categories[1]._id,
        brandId: brands[4]._id,
        images: [
          { url: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800", publicId: "oneplus_1", isPrimary: true },
        ],
        basePrice: 34999,
        salePrice: 29999,
        costPrice: 22000,
        taxRate: 18,
        hasVariants: true,
        baseSKU: "ONE-ND3",
        variants: [
          { sku: "ONE-ND3-8-BLU", attributes: { ram: "8GB", color: "Blue" }, price: 34999, salePrice: 29999, isActive: true },
          { sku: "ONE-ND3-12-BLU", attributes: { ram: "12GB", color: "Blue" }, price: 37999, salePrice: 32999, isActive: true },
          { sku: "ONE-ND3-12-BLK", attributes: { ram: "12GB", color: "Black" }, price: 37999, salePrice: 32999, isActive: true },
        ],
        specifications: [
          { group: "Display", key: "Size", value: "6.74 inches" },
          { group: "Processor", key: "Chipset", value: "Snapdragon 8 Gen 2" },
          { group: "Battery", key: "Capacity", value: "5000 mAh" },
        ],
        tags: ["oneplus", "smartphone", "indian brand", "mid-range"],
        status: "PUBLISHED",
        isTrending: true,
        returnPolicyDays: 7,
        seo: { metaTitle: "OnePlus Nord 3 | M2Stores", metaDescription: "Buy OnePlus Nord 3 smartphone", keywords: ["oneplus", "nord", "smartphone"] },
      },
      {
        name: "Titan Classic Watch",
        slug: "titan-classic-watch",
        description: "Titan Classic Watch with stainless steel strap and dial. A perfect blend of elegance and functionality for everyday wear.",
        shortDescription: "Stainless steel, quartz movement, water resistant",
        categoryId: categories[9]._id,
        brandId: brands[9]._id,
        images: [
          { url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800", publicId: "titan_1", isPrimary: true },
        ],
        basePrice: 4995,
        salePrice: 3495,
        costPrice: 2000,
        taxRate: 18,
        hasVariants: false,
        tags: ["watch", "titan", "accessories", "fashion"],
        status: "PUBLISHED",
        isFeatured: true,
        returnPolicyDays: 14,
        seo: { metaTitle: "Titan Classic Watch | M2Stores", metaDescription: "Buy Titan Classic Watch", keywords: ["titan", "watch"] },
      },
    ]);
    console.log(`✅ Created ${products.length} products`);

    // Create Inventory States
    const inventoryData = products.flatMap((p: any) => {
      if (p.variants && p.variants.length > 0) {
        return p.variants.map((v: any) => ({
          productId: p._id,
          sku: v.sku,
          stock: Math.floor(Math.random() * 50) + 5,
          reservedStock: 0,
          lowStockThreshold: 5,
        }));
      }
      return [{
        productId: p._id,
        sku: p.baseSKU || `SKU-${p._id.toString().slice(0, 8)}`,
        stock: Math.floor(Math.random() * 100) + 10,
        reservedStock: 0,
        lowStockThreshold: 5,
      }];
    });

    await InventoryState.insertMany(inventoryData);
    console.log(`✅ Created ${inventoryData.length} inventory states`);

    // Create Coupons
    const now = new Date();
    await Coupon.insertMany([
      {
        code: "WELCOME10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minOrderValue: 499,
        maxDiscountAmount: 500,
        isFirstOrderOnly: true,
        allowedUserIds: [],
        usageLimitTotal: 1000,
        usageCount: 0,
        perUserLimit: 1,
        perUserUsageCount: {},
        startDate: new Date(now.getTime() - 86400000),
        expiryDate: new Date(now.getTime() + 30 * 86400000),
        isActive: true,
      },
      {
        code: "FLAT200",
        discountType: "FIXED",
        discountValue: 200,
        minOrderValue: 1999,
        maxDiscountAmount: 200,
        usageLimitTotal: 500,
        usageCount: 0,
        perUserLimit: 2,
        perUserUsageCount: {},
        startDate: now,
        expiryDate: new Date(now.getTime() + 15 * 86400000),
        isActive: true,
      },
      {
        code: "ELECTRO15",
        discountType: "PERCENTAGE",
        discountValue: 15,
        minOrderValue: 9999,
        applicableCategoryIds: [categories[0]._id, categories[1]._id, categories[2]._id],
        usageLimitTotal: 300,
        usageCount: 0,
        perUserLimit: 1,
        perUserUsageCount: {},
        startDate: now,
        expiryDate: new Date(now.getTime() + 45 * 86400000),
        isActive: true,
      },
    ]);
    console.log("✅ Created coupons");

    // Create Banners
    await Banner.insertMany([
      {
        title: "Grand Summer Sale",
        subtitle: "Up to 50% off on selected items",
        type: "HERO",
        image: { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400", publicId: "hero_1" },
        ordering: 1,
        isActive: true,
      },
      {
        title: "Electronics Bonanza",
        subtitle: "Save big on phones, laptops & tablets",
        type: "PROMOTIONAL",
        image: { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", publicId: "promo_1" },
        linkType: "CATEGORY",
        linkTarget: "electronics",
        ordering: 2,
        isActive: true,
      },
      {
        title: "Fashion Trends 2025",
        subtitle: "Explore the latest collections",
        type: "PROMOTIONAL",
        image: { url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800", publicId: "promo_2" },
        linkType: "CATEGORY",
        linkTarget: "fashion",
        ordering: 3,
        isActive: true,
      },
    ]);
    console.log("✅ Created banners");

    // Create Homepage Config
    await HomepageConfig.create({
      sections: [
        { id: "hero-banners", type: "BANNER", ordering: 1, isActive: true },
        { id: "featured-categories", type: "CATEGORY_GRID", title: "Shop by Category", ordering: 2, isActive: true },
        { id: "trending-products", type: "PRODUCT_GRID", title: "Trending Products", ordering: 3, isActive: true },
        { id: "special-offers", type: "PROMO_STRIP", title: "Special Offers", ordering: 4, isActive: true },
      ],
      isActive: true,
    });
    console.log("✅ Created homepage config");

    // Create Settings
    await Setting.create({
      storeName: "M2Stores",
      contactEmail: "support@m2stores.com",
      contactPhone: "+91-98765-43210",
      contactAddress: "M2Stores HQ, Bangalore, India",
      currency: "INR",
      currencySymbol: "₹",
      taxRate: 18,
      shippingFlatRate: 0,
      isCODEnabled: true,
      codMinOrderValue: 199,
      codMaxOrderValue: 10000,
      codFee: 0,
      codAllowedPincodes: ["560001", "110001", "400001", "700001", "600001"],
      returnWindowDays: 7,
      phonePeEnvironment: "SANDBOX",
      notificationEmailEnabled: true,
      notificationSMSEnabled: false,
      seoTitle: "M2Stores - Online Shopping India",
      seoDescription: "Shop the best products at M2Stores - India's premium online marketplace.",
    });
    console.log("✅ Created settings");

    console.log("\n🎉 ✅ Seed data completed successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
};

seedData();
