import Teacher from '../models/Teacher.js';

// Create a new teacher
export const createTeacher = async (req, res) => {
  try {
    // Accept both 'institute' and 'insititute' from frontend, map to correct field
    const data = req.body;
    const teacher = new Teacher(data);
    await teacher.save();
    res.status(201).json({ message: 'Teacher created successfully', teacher });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all teachers
export const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('institute');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a teacher by ID
export const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ uuid: req.params.uuid }).populate('institute');
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a teacher by ID
export const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a teacher by ID
export const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ message: 'Teacher deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
