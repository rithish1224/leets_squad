import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSolvedOverTime,
  getDifficultyDistribution,
  getDailyGoalHistory,
  getWeeklyGoalHistory,
  getHeatmapData,
} from '../services/goals.service';
import { getStreakHistory } from '../services/streak.service';
import { sendSuccess } from '../utils/errors';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const days = parseInt(req.query.days as string) || 30;

    const [solvedOverTime, difficultyDistribution, dailyHistory, weeklyHistory, streakHistory, heatmap] =
      await Promise.all([
        getSolvedOverTime(userId, days),
        getDifficultyDistribution(userId),
        getDailyGoalHistory(userId, days),
        getWeeklyGoalHistory(userId, 12),
        getStreakHistory(userId, days),
        getHeatmapData(userId, 365),
      ]);

    sendSuccess(res, {
      solvedOverTime,
      difficultyDistribution,
      dailyHistory,
      weeklyHistory,
      streakHistory,
      heatmap,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
