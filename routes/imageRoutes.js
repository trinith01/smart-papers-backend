import express from 'express';
import { getImage, uploadImage } from '../controllers/imageController.js';

const router = express.Router();
router.get('/image', getImage);
router.put('/images', uploadImage);
export default router;
