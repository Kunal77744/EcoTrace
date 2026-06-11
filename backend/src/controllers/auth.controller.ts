import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const generateToken = (id: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'secret';
  return jwt.sign({ id, email, role }, secret, {
    expiresIn: (process.env.JWT_EXPIRE || '24h') as any,
  });
};

/**
 * Handle new user registration.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
      return;
    }

    const user = new User({
      name,
      email,
      password,
      role: role || 'user',
    });

    await user.save();

    const token = generateToken(user._id.toString(), user.email, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalPoints: user.totalPoints,
        completedChallenges: user.completedChallenges || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login / token generation.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
      return;
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
      return;
    }

    const token = generateToken(user._id.toString(), user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalPoints: user.totalPoints,
        completedChallenges: user.completedChallenges || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication context is missing user details.',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalPoints: user.totalPoints,
        completedChallenges: user.completedChallenges || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch top 5 users sorted by points for the leaderboard.
 */
export const getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topUsers = await User.find()
      .select('name totalPoints')
      .sort({ totalPoints: -1 })
      .limit(5)
      .lean();
    res.status(200).json({
      success: true,
      data: topUsers,
    });
  } catch (error) {
    next(error);
  }
};
