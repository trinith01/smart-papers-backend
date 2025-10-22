#!/usr/bin/env node
import dotenv from "dotenv";
import mongoose from "mongoose";
import Institute from "./models/institutes.js";

dotenv.config();

/**
 * Seed initial institutes into the database
 * 
 * Creates three institutes:
 * - Dakma, Matara
 * - Viduna, Galle
 * 
 * Usage:
 *   npm run institute-seed
 */

// ===== Config =====
const MONGODB_URI = process.env.MONGO_URI 

// ===== Institute Data =====
const institutes = [
  {
    name: "Dakma",
    location: "Matara"
  },
  {
    name: "Viduna", 
    location: "Galle",

  },
  
];

// ===== Database Connection =====
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    throw error;
  }
}

// ===== Seed Runner =====
const seedInstitutes = async () => {
  try {
    console.log("🌱 Starting institute seeding process...");
    
    // Connect to database
    await connectDB();

    // Delete all existing institutes before seeding
    console.log("🧹 Deleting all existing institutes...");
    const cleanup = await Institute.deleteMany({});
    
    if (cleanup.deletedCount > 0) {
      console.log(`✅ Deleted ${cleanup.deletedCount} existing institutes`);
    } else {
      console.log("ℹ️ No existing institutes found to delete");
    }

    // Insert new institutes
    console.log("📝 Inserting new institutes...");
    const insertedInstitutes = await Institute.insertMany(institutes, { ordered: true });

    // Summary
    console.log("\n🎉 === INSTITUTE SEED SUMMARY ===");
    console.log(`✅ Successfully inserted ${insertedInstitutes.length} institutes:`);
    
    insertedInstitutes.forEach((institute, index) => {
      console.log(`   ${index + 1}. ${institute.name} - ${institute.location} (ID: ${institute._id})`);
    });

    console.log("\n🔌 Closing database connection...");
    await mongoose.disconnect();
    console.log("✅ Done! Database connection closed.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Institute seeding failed:", error.message);
    
    // Ensure we disconnect even if there's an error
    try {
      await mongoose.disconnect();
      console.log("🔌 Database connection closed after error");
    } catch (disconnectError) {
      console.error("Failed to disconnect:", disconnectError.message);
    }
    
    process.exit(1);
  }
};

// Run the seeding process
seedInstitutes();