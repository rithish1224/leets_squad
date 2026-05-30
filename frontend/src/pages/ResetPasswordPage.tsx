import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Code2, Sparkles, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authApi } from '../lib/api';
import { Button } from '../components/Layout';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verify reset token and get email
    const verifyToken = async () => {
      if (!resetToken) {
        setError('Invalid reset link');
        setIsLoadingToken(false);
        return;
      }
      try {
        const response = await authApi.verifyResetToken(resetToken);
        setEmail(response.data.data.email);
        setIsLoadingToken(false);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Invalid or expired reset link';
        setError(msg);
        setIsLoadingToken(false);
      }
    };
    verifyToken();
  }, [resetToken]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authApi.sendResetOtp(email);
      const newResetToken = response.data.data.resetToken;
      if (newResetToken) {
        // Update URL with new reset token
        window.history.replaceState(null, '', `/reset-password?token=${encodeURIComponent(newResetToken)}`);
      }
      setError('');
      setSuccess('OTP resent to your email!');
      setResendTimer(30);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to resend OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email) {
      setError('Email is missing. Please start over from forgot password page.');
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('OTP must be exactly 6 digits');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyOtpAndReset(email, otp, newPassword);
      setSuccess('Password reset successfully! Redirecting to login...');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to reset password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 py-12 relative">
      <div className="absolute top-6 left-6 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#00e699]/15 border border-[#00e699]/30 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-[#00e699]" />
        </div>
        <span className="font-bold text-sm text-white">LeetSquad</span>
      </div>

      <div className="w-full max-w-md relative z-10 mt-16 sm:mt-0">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-gray-400 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#00e699]" />
            Verify & reset
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reset your password</h1>
          <p className="text-gray-400 mt-2 text-sm">Enter the OTP sent to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400">Reset Password</h2>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#00e699] hover:bg-[#00e699]/10 transition-colors"
              title="Back to login"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {isLoadingToken && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#00e699] border-t-transparent mb-3" />
              <p className="text-gray-400 text-sm">Verifying reset link...</p>
            </div>
          )}

          {!isLoadingToken && !email && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error || 'Invalid or expired reset link. Please request a new one from the forgot password page.'}
            </div>
          )}

          {!isLoadingToken && email && (
            <>
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/25 text-green-400 px-4 py-3 rounded-xl text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 glass rounded-xl text-gray-500 placeholder-gray-600 cursor-not-allowed opacity-75"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">6-Digit OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              className="w-full px-4 py-3 glass rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00e699]/40 focus:ring-1 focus:ring-[#00e699]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                className="w-full px-4 py-3 pr-12 glass rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00e699]/40 focus:ring-1 focus:ring-[#00e699]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-[#00e699] transition-colors p-1 rounded hover:bg-[#00e699]/10"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full px-4 py-3 pr-12 glass rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00e699]/40 focus:ring-1 focus:ring-[#00e699]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 text-gray-500 hover:text-[#00e699] transition-colors p-1 rounded hover:bg-[#00e699]/10"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading || isLoadingToken} className="w-full mt-2">
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Didn't receive OTP?{' '}
            {resendTimer > 0 ? (
              <span className="text-gray-600">Resend in {resendTimer}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-[#00e699] hover:text-[#00c282] font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send again'}
              </button>
            )}
          </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
