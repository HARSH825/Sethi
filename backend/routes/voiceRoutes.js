// backend/routes/voiceRoutes.js (COMPLETE AFTER PHASE 1)
import express from 'express';
import voiceController from '../controllers/voiceController.js';

const router = express.Router();

// Voice onboarding endpoint (WORKING PERFECTLY)
router.post('/process-onboarding', (req, res, next) => {
  const upload = req.app.get('upload');
  upload.single('audio')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    voiceController.processOnboarding(req, res);
  });
});

// General navigation endpoint (WORKING)
router.post('/process-navigation', (req, res, next) => {
  const upload = req.app.get('upload');
  upload.single('audio')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    voiceController.processNavigation(req, res);
  });
});

// NEW: Scheme-specific navigation endpoint (PHASE 1 ENHANCEMENT)
router.post('/process-scheme-navigation', (req, res, next) => {
  const upload = req.app.get('upload');
  upload.single('audio')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    voiceController.processSchemeNavigation(req, res);
  });
});

// Health check endpoint
router.get('/health', voiceController.healthCheck);

export default router;
