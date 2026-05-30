import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Code2, Sparkles, Mail } from 'lucide-react';
import { authApi } from '../lib/api';
import { Button, Input } from '../components/Layout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success && resetToken) {
      const timer = setTimeout(() => {
        navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, resetToken, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await authApi.sendResetOtp(email);
      const newResetToken = response.data.data.resetToken;
      if (newResetToken) {
        setResetToken(newResetToken);
        setSuccess('OTP sent to your email! Redirecting...');
        setOtpSent(true);
        setResendTimer(30);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to send OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authApi.sendResetOtp(email);
      const newResetToken = response.data.data.resetToken;
      if (newResetToken) {
        setResetToken(newResetToken);
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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-6 left-6 flex items-center gap-2.5 z-10">
        <div className="w-9 h-9 rounded-xl bg-[#00e699]/15 border border-[#00e699]/30 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-[#00e699]" />
        </div>
        <span className="font-bold text-sm text-white">LeetSquad</span>
      </div>

      <div className="w-full max-w-md text-center relative z-10 mt-16 sm:mt-0">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-gray-400 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[#00e699]" />
          Reset your password
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
          Forgot your
          <br />
          password?
        </h1>
        <p className="text-gray-400 mt-4 text-base max-w-md mx-auto">
          Enter your email and we'll send you a 6-digit code to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 mt-10 text-left space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">Request Password Reset</h2>
          </div>

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

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <p className="text-xs text-gray-500">
            We'll send a 6-digit OTP to this email. It will expire in 10 minutes.
          </p>

          <Button type="submit" disabled={loading || resendTimer > 0} className="w-full flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" />
            {loading ? 'Sending OTP...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Send OTP'}
          </Button>

          {otpSent && resendTimer === 0 && (
            <Button 
              type="button" 
              onClick={handleResend} 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'Resending...' : 'Resend OTP'}
            </Button>
          )}

          <p className="text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="text-[#00e699] hover:text-[#00c282] font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
