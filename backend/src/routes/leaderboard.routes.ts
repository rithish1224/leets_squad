import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import {
  getGlobalLeaderboard,
  getWeeklyGlobalLeaderboard,
} from '../services/leaderboard.service';
import { sendSuccess } from '../utils/errors';

const router = Router();

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const weekly = req.query.weekly === 'true';
    const leaderboard = weekly
      ? await getWeeklyGlobalLeaderboard()
      : await getGlobalLeaderboard();
    sendSuccess(res, leaderboard);
  } catch (error) {
    next(error);
  }
});

export default router;
