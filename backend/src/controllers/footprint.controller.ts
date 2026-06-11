import { Request, Response, NextFunction } from 'express';
import { Footprint } from '../models/Footprint';
import { User } from '../models/User';
import { analyzeCarbonFootprintText } from '../services/gemini.service';
import { sumEmissions } from '../utils/emissions';

/**
 * Controller to handle footprint calculation.
 * Sends user text to Gemini, saves the resulting estimations, rewards points to the user, and returns metrics.
 */
export const calculateFootprint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication context is missing user details.',
      });
      return;
    }

    // 1. Analyze text prompt using Gemini service
    const analysis = await analyzeCarbonFootprintText(text);

    // Ensure that any category metric that is NOT explicitly provided or parsed defaults strictly to 0
    const energyEmission = (analysis && typeof analysis.energyEmission === 'number' && !isNaN(analysis.energyEmission)) ? analysis.energyEmission : 0;
    const transportEmission = (analysis && typeof analysis.transportEmission === 'number' && !isNaN(analysis.transportEmission)) ? analysis.transportEmission : 0;
    const foodEmission = (analysis && typeof analysis.foodEmission === 'number' && !isNaN(analysis.foodEmission)) ? analysis.foodEmission : 0;

    // 2. Calculate aggregated total emissions using the safety utility
    const totalEmission = sumEmissions(
      energyEmission,
      transportEmission,
      foodEmission
    );

    // 3. Create and save footprint record linked to authenticated user
    const footprint = new Footprint({
      userId,
      energyEmission,
      transportEmission,
      foodEmission,
      totalEmission,
      suggestions: analysis?.suggestions || [],
    });

    await footprint.save();

    // 4. Reward user with sustainability points for logging footprint (e.g. 10 points base)
    const pointsRewarded = 10;
    await User.findByIdAndUpdate(userId, {
      $inc: { totalPoints: pointsRewarded },
    });

    res.status(201).json({
      success: true,
      message: 'Carbon footprint analyzed and recorded successfully.',
      data: {
        id: footprint._id,
        userId: footprint.userId,
        energyEmission: footprint.energyEmission,
        transportEmission: footprint.transportEmission,
        foodEmission: footprint.foodEmission,
        totalEmission: footprint.totalEmission,
        suggestions: footprint.suggestions,
        pointsAwarded: pointsRewarded,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch all footprint logs logged by the authenticated user.
 */
export const getFootprintHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication context is missing user details.',
      });
      return;
    }

    const logs = await Footprint.find({ userId }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch all active sustainability challenges.
 */
export const getChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const challenges = [
      {
        id: '1',
        title: 'No Car Day',
        description: 'Use public transport, bike, or walk for all your commutes today.',
        pointsReward: 50,
        durationDays: 1,
      },
      {
        id: '2',
        title: 'Energy Saver',
        description: 'Turn off all non-essential appliances and air conditioning for 4 hours.',
        pointsReward: 30,
        durationDays: 1,
      },
      {
        id: '3',
        title: 'Plant-Based Diet',
        description: 'Eat only vegetarian or vegan meals today to reduce food footprint.',
        pointsReward: 40,
        durationDays: 1,
      },
    ];
    res.status(200).json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle challenge completion.
 * Increments user points and marks the challenge completed.
 */
export const completeChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication context is missing user details.',
      });
      return;
    }

    const challenges = [
      { id: '1', title: 'No Car Day', pointsReward: 50 },
      { id: '2', title: 'Energy Saver', pointsReward: 30 },
      { id: '3', title: 'Plant-Based Diet', pointsReward: 40 },
    ];

    const challenge = challenges.find((c) => c.id === id);
    if (!challenge) {
      res.status(404).json({
        success: false,
        message: 'Challenge not found.',
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

    if (!user.completedChallenges) {
      user.completedChallenges = [];
    }

    if (user.completedChallenges.includes(id)) {
      res.status(400).json({
        success: false,
        message: 'You have already completed this challenge.',
      });
      return;
    }

    user.completedChallenges.push(id);
    user.totalPoints += challenge.pointsReward;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Challenge "${challenge.title}" completed successfully!`,
      data: {
        totalPoints: user.totalPoints,
        completedChallenges: user.completedChallenges,
      },
    });
  } catch (error) {
    next(error);
  }
};

