// backend/routes/schemeRoutes.js (COMPLETE UPDATED FILE)
import express from 'express';
import schemeController from '../controllers/schemeController.js';

const router = express.Router();

// Get all schemes with filters
router.get('/', schemeController.getSchemes);

// Search schemes
router.get('/search', schemeController.searchSchemes);

// Get scheme categories
router.get('/categories', schemeController.getCategories);

// Get single scheme by ID (with optional user context)
router.get('/:id', schemeController.getScheme);

export default router;
