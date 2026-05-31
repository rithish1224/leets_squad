import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/Layout';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      login(res.data.data.token, res.data.data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { error?: string | { message?: string } } } })?.response?.data?.error;
      const msg = typeof errorData === 'object' && errorData !== null
        ? errorData.message || 'Login failed'
        : (errorData as string) || 'Login failed';
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

      <div className="w-full max-w-lg text-center relative z-10 mt-16 sm:mt-0">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-gray-400 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[#00e699]" />
          LeetCode-powered accountability
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
          Stay accountable.
          <br />
          Keep grinding.
        </h1>
        <p className="text-gray-400 mt-4 text-base max-w-md mx-auto">
          Track your LeetCode progress, hit daily goals, and compete with your squad.
        </p>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 mt-10 text-left space-y-5">
          <h2 className="text-lg font-semibold text-white">Sign in</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
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

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-[#00e699] hover:text-[#00c282]">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            No account?{' '}
            <Link to="/register" className="text-[#00e699] hover:text-[#00c282] font-medium">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
