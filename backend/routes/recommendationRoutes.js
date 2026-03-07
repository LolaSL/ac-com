import express from 'express';
import { COMMON_AC_RECOMMENDATIONS } from '../data.js';

const router = express.Router();

// @desc    Get common AC recommendations
// @route   GET /api/recommendations
// @access  Public
router.get('/', (req, res) => {
  res.json(COMMON_AC_RECOMMENDATIONS);
});

export default router;
