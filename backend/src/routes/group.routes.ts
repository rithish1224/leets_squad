import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import {
  createGroup,
  joinGroup,
  getUserGroups,
  getGroupDashboard,
  getGroupById,
  updateGroupSettings,
  updateGroupGoals,
  leaveGroup,
  deleteGroup,
} from '../services/group.service';
import { getGroupActivity } from '../services/activity.service';
import {
  getGroupLeaderboard,
  getGroupWeeklyLeaderboard,
} from '../services/leaderboard.service';
import { sendSuccess, AppError } from '../utils/errors';

const router = Router();

function groupId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

router.use(authenticate);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required'),
    body('description').optional().trim(),
    body('daily_goal').optional().isInt({ min: 1 }),
    body('weekly_goal').optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);

      const group = await createGroup(req.user!.userId, req.body);
      sendSuccess(res, group, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/join',
  [body('group_code').trim().notEmpty().withMessage('Group code required')],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);

      const group = await joinGroup(req.user!.userId, req.body.group_code);
      sendSuccess(res, group);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', async (req, res, next) => {
  try {
    const groups = await getUserGroups(req.user!.userId);
    sendSuccess(res, groups);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await getGroupById(groupId(req));
    if (!group) throw new AppError(404, 'Group not found');
    sendSuccess(res, group);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await getGroupDashboard(groupId(req));
    sendSuccess(res, dashboard);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id/goals',
  [
    body('daily_goal').optional().isInt({ min: 1 }),
    body('weekly_goal').optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goals = await updateGroupGoals(
        groupId(req),
        req.user!.userId,
        req.body
      );
      sendSuccess(res, goals);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id/settings',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim(),
    body('daily_goal').optional().isInt({ min: 1 }),
    body('weekly_goal').optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);

      const settings = await updateGroupSettings(groupId(req), req.user!.userId, req.body);
      sendSuccess(res, settings);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekly = req.query.weekly === 'true';
    const id = groupId(req);
    const leaderboard = weekly
      ? await getGroupWeeklyLeaderboard(id)
      : await getGroupLeaderboard(id);
    sendSuccess(res, leaderboard);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = groupId(req);
    const limit = parseInt(req.query.limit as string) || 30;
    const activity = await getGroupActivity(id, limit);
    sendSuccess(res, activity);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteGroup(groupId(req), req.user!.userId);
    sendSuccess(res, { message: 'Group deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await leaveGroup(req.user!.userId, groupId(req));
    sendSuccess(res, { message: 'Left group successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
