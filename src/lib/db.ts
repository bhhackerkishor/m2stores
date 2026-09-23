import mongoose, { Mongoose } from "mongoose";

// Side-effect: register all schemas before any query/populate (avoids MissingSchemaError).
import "@/models";

declare global {
  // eslint-disable-next-line no-var
  var __m2_mongoose: { conn: Mongoose | null; promise: Promise<Mongoose> | null } | undefined;
}

const cached = global.__m2_mongoose || (global.__m2_mongoose = { conn: null, promise: null });

function getUri(explicit?: string): string {
  const uri = explicit || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env / .env.local or pass an explicit URI.");
  }
  return uri;
}

export async function connectDB(explicitUri?: string): Promise<Mongoose> {
  // If mongoose is already connected (e.g. tests using MongoMemoryReplSet),
  // reuse that connection instead of opening a second one.
  if (mongoose.connection.readyState === 1) {
    if (!explicitUri) {
      cached.conn = mongoose as unknown as Mongoose;
      return cached.conn;
    }
    // Explicit URI requested: reuse only if it matches the live connection.
    const liveUrl: string | undefined = (mongoose.connection as any)?.client?.s?.url;
    if (liveUrl && explicitUri && liveUrl.startsWith(explicitUri.split("?")[0])) {
      cached.conn = mongoose as unknown as Mongoose;
      return cached.conn;
    }
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };
    cached.promise = mongoose.connect(getUri(explicitUri), opts).then((m) => {
      cached.conn = m;
      return m;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  cached.conn = null;
  cached.promise = null;
}

export default connectDB;
