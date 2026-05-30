import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getStreakForUser, getStreakHistory } from '../services/streak.service';
import { sendSuccess } from '../utils/errors';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const days = parseInt(req.query.days as string) || 90;

    const [streak, history] = await Promise.all([
      getStreakForUser(userId),
      getStreakHistory(userId, days),
    ]);

    sendSuccess(res, { streak, history });
  } catch (error) {
    next(error);
  }
});

export default router;
