import express from 'express';
import {
  registerStudent,
  getAllStudents,
  getStudentByUuid,
  updateStudent,
  deleteStudent
} from '../controllers/studentController.js';

const router = express.Router();

// POST /students
router.post('/', registerStudent);

// GET /students
router.get('/', getAllStudents);

// GET /students/:id
router.get('/:uuid', getStudentByUuid);

// PUT /students/:id
router.put('/:id', updateStudent);

// DELETE /students/:id
router.delete('/:id', deleteStudent);

export default router;
