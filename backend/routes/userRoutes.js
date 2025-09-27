// routes/userRoutes.js (Fixed)
import express from 'express';
import userController from '../controllers/userController.js';

const router = express.Router();

// User management endpoints - ensure proper parameter patterns
router.post('/', userController.createUser);
router.get('/:id', userController.getUserProfile);
router.get('/:id/recommendations', userController.getRecommendations);

export default router;
