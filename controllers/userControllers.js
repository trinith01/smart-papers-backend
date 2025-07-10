import Student from "../models/Student.js";
import bcrypt from "bcryptjs";

export const registerStudent = async (req, res) => {
  try {
    const { name, email, teacher, year, category, uuid } = req.body;

    // Validate inputs
    if (!name || !email || !password || !year || !category || !uuid) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student
    const newStudent = new Student({
      name,
      email,
      teacher: "Default Teacher", // Assuming a default teacher, can be modified
      year,
      category,
      uuid,
    });

    await newStudent.save();
    res.status(201).json({ message: "Student registered successfully." });
  } catch (error) {
    console.error("Error registering student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}