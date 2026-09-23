/**
 * Registers every Mongoose model on first DB use.
 * Next.js code-splits routes, so Product.populate("brandId") can run before
 * Brand's module has been evaluated → MissingSchemaError. Importing all models
 * from connectDB() makes registration deterministic.
 */
import "./Address";
import "./AuditLog";
import "./Banner";
import "./Brand";
import "./Cart";
import "./Category";
import "./Coupon";
import "./HomepageConfig";
import "./Inventory";
import "./Notification";
import "./Offer";
import "./Order";
import "./Payment";
import "./Product";
import "./ReturnRequest";
import "./Review";
import "./Setting";
import "./SupportTicket";
import "./User";
import "./Wishlist";

export {};
