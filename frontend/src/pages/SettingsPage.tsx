import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { userApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import {
  Layout,
  Card,
  Button,
  Input,
  Select,
  PageHeader,
  Alert,
  ConfirmDialog,
} from '../components/Layout';

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

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    leetcode_username: user?.leetcode_username ?? '',
    timezone: user?.timezone ?? 'UTC',
    daily_goal: user?.daily_goal ?? 2,
    weekly_goal: user?.weekly_goal ?? 20,
  });
  const [saved, setSaved] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      leetcode_username: user.leetcode_username ?? '',
      timezone: user.timezone ?? 'UTC',
      daily_goal: user.daily_goal ?? 2,
      weekly_goal: user.weekly_goal ?? 20,
    });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => userApi.updateSettings(form),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => userApi.deleteAccount(),
    onSuccess: () => {
      setDeleteConfirmOpen(false);
      logout();
      navigate('/login');
    },
  });

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        <PageHeader title="Settings" subtitle="Manage your account and goals" />

        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Username</p>
                <p className="font-medium mt-0.5">{user?.username}</p>
              </div>
              <div>
                <p className="text-gray-400">Email</p>
                <p className="font-medium mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">LeetCode Integration</h2>
          <div className="space-y-4">
            <Input
              label="LeetCode Username"
              value={form.leetcode_username}
              onChange={(e) => setForm({ ...form, leetcode_username: e.target.value })}
              placeholder="your-leetcode-handle"
              hint="Use your profile handle only (e.g. john_doe). Not your email or profile URL."
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Goals & Timezone</h2>
          <div className="space-y-4">
            <Select
              label="Timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500">
              Daily goals reset at midnight in your selected timezone.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Daily Goal (problems)"
                type="number"
                min={1}
                value={form.daily_goal}
                onChange={(e) =>
                  setForm({ ...form, daily_goal: parseInt(e.target.value) || 1 })
                }
              />
              <Input
                label="Weekly Goal (problems)"
                type="number"
                min={1}
                value={form.weekly_goal}
                onChange={(e) =>
                  setForm({ ...form, weekly_goal: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>
        </Card>

        {saved && <Alert type="success">Settings saved successfully!</Alert>}
        {updateMutation.isError && <Alert type="error">Failed to save settings.</Alert>}

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>

        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg font-semibold text-white leading-tight">Delete Account</h2>
              <p className="text-sm text-gray-400 leading-6 max-w-xl">
                Permanently remove your account, groups, goals, submissions, and all related data.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 shrink-0"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete account?"
        description="This permanently removes your account and all associated data. This cannot be undone."
        icon={<Trash2 className="w-6 h-6 text-red-500" />}
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Layout>
  );
}
