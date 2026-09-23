// test-mongoose.js
import mongoose from 'mongoose';

// Replace with your actual database connection string
const uri = "mongodb+srv://kishor47gaming:Kishor47gaming@cluster1.zn0ef.mongodb.net/m2storesv1?";

async function testMongoose() {
  try {
    console.log("⏳ Attempting Mongoose connection...");
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds instead of waiting forever
    });

    console.log("✅ Mongoose connected successfully!");
  } catch (error) {
    console.error("❌ Mongoose connection failed!");
    console.error(error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Mongoose disconnected.");
  }
}

testMongoose();
