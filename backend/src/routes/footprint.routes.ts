import { Router } from 'express';
import { calculateFootprint, getFootprintHistory, getChallenges, completeChallenge, deleteFootprint } from '../controllers/footprint.controller';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { calculateFootprintSchema } from '../validations/footprint.validation';

const router = Router();

/**
 * @route   POST /api/footprint/calculate
 * @desc    Submit natural language text describing activity to calculate carbon emissions
 * @access  Private
 */
router.post('/calculate', auth, validate(calculateFootprintSchema), calculateFootprint);

/**
 * @route   GET /api/footprint/history
 * @desc    Get all footprint records for the authenticated user
 * @access  Private
 */
router.get('/history', auth, getFootprintHistory);

/**
 * @route   GET /api/footprint/challenges
 * @desc    Get all active sustainability challenges
 * @access  Private
 */
router.get('/challenges', auth, getChallenges);

/**
 * @route   POST /api/footprint/challenges/:id/complete
 * @desc    Mark a challenge as completed and add rewards points
 * @access  Private
 */
router.post('/challenges/:id/complete', auth, completeChallenge);

/**
 * @route   DELETE /api/footprint/:id
 * @desc    Delete a carbon footprint log record
 * @access  Private
 */
router.delete('/:id', auth, deleteFootprint);

export default router;
