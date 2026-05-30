import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Select } from '../components/Layout';

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    leetcode_username: '',
    timezone: 'Asia/Kolkata',
  });
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
      const res = await authApi.register(form);
      login(res.data.data.token, res.data.data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Registration failed';
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
            Join the grind
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-gray-400 mt-2 text-sm">Connect LeetCode and start tracking today.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-8 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <Input
            label="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="rithish"
            required
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            required
          />

          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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

          <Input
            label="LeetCode Username"
            value={form.leetcode_username}
            onChange={(e) => setForm({ ...form, leetcode_username: e.target.value })}
            placeholder="your-leetcode-handle"
            hint="Your profile handle only — not email or full URL"
          />

          <Select
            label="Timezone"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz} className="bg-black">
                {tz}
              </option>
            ))}
          </Select>

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#00e699] hover:text-[#00c282] font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
