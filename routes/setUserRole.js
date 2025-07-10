import express from 'express';
import { setUserRole } from '../controllers/setUserRoleController.js';

const router = express.Router();

router.post('/', setUserRole);

export default router;
