#!/usr/bin/env node
import  dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Student from "./models/Student.js";
dotenv.config();
/**
 * Seed 50 students for the given teacher and two institutes.
 * - All students: year = "2025", category = ["paper"]
 * - Teacher: 688e0cb2786955788cd0029c
 * - 25 students under institute 686914bf3700d5d526983c52
 * - 25 students under institute 686914bf3700d5d526983c55
 *
 * Usage:
 *   MONGODB_URI="mongodb://127.0.0.1:27017/your_db" node seed-students.mjs
 *   # or chmod +x seed-students.mjs && ./seed-students.mjs
 */

// ===== Config =====
const MONGODB_URI = process.env.MONGODB_URI

const TEACHER_ID = "688e0cb2786955788cd0029c";
const INSTITUTE_A = "686914bf3700d5d526983c52";
const INSTITUTE_B = "686914bf3700d5d526983c55";



// ===== Helpers =====
const oid = (hex) => new mongoose.Types.ObjectId(hex);

function makeStudent(i, instituteHex) {
  const idx = String(i + 1).padStart(3, "0"); // 001..050
  return {
    name: `Seed Student ${idx}`,
    uuid: randomUUID(), // unique
    email: `seed.student${idx}@example.com`, // unique
    year: "2025",
    followedTeachers: [
      {
        teacher: oid(TEACHER_ID),
        institute: oid(instituteHex),
        category: ["paper"],
      },
    ],
  };
}

async function connectDB() {
  await mongoose.connect(MONGODB_URI, { autoIndex: true });
}

// ===== Seed Runner =====
const seed = async () => {
  try {
    console.log("Connecting to MongoDB…");
    await connectDB();
    console.log("Connected.");

    // Optional cleanup of previously seeded docs by our pattern
    const cleanup = await Student.deleteMany({
      $or: [
        { name: /^Seed Student \d{3}$/ },
        { email: /^seed\.student\d{3}@example\.com$/ },
      ],
    });
    if (cleanup.deletedCount) {
      console.log(`Cleaned up ${cleanup.deletedCount} previously seeded docs.`);
    }

    // Build 50 docs: 25 for INSTITUTE_A, 25 for INSTITUTE_B
    const docs = [];
    for (let i = 0; i < 25; i++) docs.push(makeStudent(i, INSTITUTE_A));
    for (let i = 25; i < 50; i++) docs.push(makeStudent(i, INSTITUTE_B));

    const inserted = await Student.insertMany(docs, { ordered: true });

    // Summary
    console.log("\n=== SEED SUMMARY ===");
    console.log(`Inserted students: ${inserted.length}`);
    console.log(`Teacher: ${TEACHER_ID}`);
    console.log(`Institutes: 25 → ${INSTITUTE_A}, 25 → ${INSTITUTE_B}`);
    console.log(`Year: 2025, Category: ["paper"]`);

    await mongoose.disconnect();
    console.log("\nDone. Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
};

seed();
