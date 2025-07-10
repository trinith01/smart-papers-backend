import express from 'express';
import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} from '../controllers/teacherController.js';

const teacherRouter = express.Router();

// Create a new teacher
teacherRouter.post('/', createTeacher);

// Get all teachers
teacherRouter.get('/', getTeachers);

// Get a teacher by ID
teacherRouter.get('/:uuid', getTeacherById);

// Update a teacher by ID
teacherRouter.put('/:id', updateTeacher);

// Delete a teacher by ID
teacherRouter.delete('/:id', deleteTeacher);

export default teacherRouter;
