import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { auth } from '../middlewares/auth';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
    email: z.string().trim().email('Please enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters long.'),
    role: z.enum(['user', 'admin']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Please enter a valid email address.'),
    password: z.string().min(1, 'Password cannot be blank.'),
  }),
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', validate(loginSchema), login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user details
 * @access  Private
 */
router.get('/me', auth, getMe);

export default router;
