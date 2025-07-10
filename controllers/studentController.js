import Student from '../models/Student.js';

// CREATE
export const registerStudent = async (req, res) => {
  try {
    const { name, email, followedTeachers, year,  uuid } = req.body;

    // Validate inputs
    if (!name || !email  || !year  |followedTeachers| !uuid) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already exists." });
    }

    

    // Create new student
    const newStudent = new Student({
      name,
      email,
      followedTeachers, // Assuming a default teacher, can be modified
      year,
    
      uuid,
    });

    await newStudent.save();
    res.status(201).json({ message: "Student registered successfully." });
  } catch (error) {
    console.error("Error registering student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// READ all
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().populate('followedTeachers.teacher').populate('followedTeachers.institute');
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ by ID
export const getStudentByUuid = async (req, res) => {
  try {
    const student = await Student.findOne({ uuid: req.params.uuid })
      .populate('followedTeachers.teacher')
      .populate('followedTeachers.institute');
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.status(200).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateStudent = async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ error: 'Student not found' });
    res.status(200).json({ message: "student updated succefully!!!", data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE
export const deleteStudent = async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Student not found' });
    res.status(200).json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
