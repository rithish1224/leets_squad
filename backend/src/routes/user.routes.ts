import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { deleteUserAccount, updateUserSettings } from '../services/auth.service';
import { normalizeLeetCodeUsername, isValidLeetCodeUsername } from '../utils/leetcode';
import {
  syncUserLeetCode,
  getLastSyncLog,
  getLatestSnapshot,
  getRecentSubmissions,
} from '../services/sync.service';
import { getDailyProgress, getWeeklyProgress } from '../services/goals.service';
import { getStreakForUser } from '../services/streak.service';
import { sendSuccess, AppError } from '../utils/errors';

const router = Router();

router.use(authenticate);

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const [daily, weekly, streak, snapshot, lastSync, recentSubmissions] =
      await Promise.all([
        getDailyProgress(userId),
        getWeeklyProgress(userId),
        getStreakForUser(userId),
        getLatestSnapshot(userId),
        getLastSyncLog(userId),
        getRecentSubmissions(userId, 10),
      ]);

    sendSuccess(res, {
      daily,
      weekly,
      streak,
      snapshot,
      lastSync,
      recentSubmissions,
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/settings',
  [
    body('leetcode_username').optional().trim(),
    body('timezone').optional().trim(),
    body('daily_goal').optional().isInt({ min: 1 }),
    body('weekly_goal').optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);

      const payload = { ...req.body };
      if (payload.leetcode_username) {
        payload.leetcode_username = normalizeLeetCodeUsername(payload.leetcode_username);
        if (payload.leetcode_username && !isValidLeetCodeUsername(payload.leetcode_username)) {
          throw new AppError(400, 'Invalid LeetCode username. Use your profile handle only.');
        }
      }

      const user = await updateUserSettings(req.user!.userId, payload);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/me', async (req, res, next) => {
  try {
    await deleteUserAccount(req.user!.userId);
    sendSuccess(res, { message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/sync', async (req, res, next) => {
  try {
    const result = await syncUserLeetCode(req.user!.userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.get('/daily-progress', async (req, res, next) => {
  try {
    const progress = await getDailyProgress(req.user!.userId);
    sendSuccess(res, progress);
  } catch (error) {
    next(error);
  }
});

router.get('/weekly-progress', async (req, res, next) => {
  try {
    const progress = await getWeeklyProgress(req.user!.userId);
    sendSuccess(res, progress);
  } catch (error) {
    next(error);
  }
});

export default router;
