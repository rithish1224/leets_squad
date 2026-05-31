import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { registerUser, loginUser, getUserById, sendPasswordResetOtp, verifyOtpAndResetPassword, verifyResetToken } from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, AppError } from '../utils/errors';
import { passwordResetLimiter, otpResendLimiter, authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

function validate(req: Request, _res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(400, errors.array()[0].msg);
  }
  next();
}

router.post(
  '/register',
  authLimiter,
  [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email').isEmail().withMessage('Valid email required').trim().toLowerCase(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one symbol'),
    body('leetcode_username').optional().trim(),
    body('timezone').optional().trim(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await registerUser(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email required').trim().toLowerCase(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await loginUser(req.body.email, req.body.password);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Logged out successfully' });
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) throw new AppError(404, 'User not found');
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/send-reset-otp',
  passwordResetLimiter,
  [body('email').isEmail().withMessage('Valid email required').trim().toLowerCase()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await sendPasswordResetOtp(req.body.email);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/verify-reset-token/:resetToken',
  [param('resetToken').isLength({ min: 64, max: 64 }).withMessage('Invalid reset token')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resetToken = Array.isArray(req.params.resetToken)
        ? req.params.resetToken[0]
        : req.params.resetToken;
      const result = await verifyResetToken(resetToken);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/verify-otp-and-reset',
  otpResendLimiter,
  [
    body('email').isEmail().withMessage('Valid email required').trim().toLowerCase(),
    body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one symbol'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await verifyOtpAndResetPassword(
        req.body.email,
        req.body.otp,
        req.body.newPassword
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
