import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Zap,
  Trash2,
  LogOut,
  Activity,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { groupApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Layout,
  Card,
  StatCard,
  StatusBadge,
  ProgressBar,
  Button,
  Alert,
  Input,
} from '../components/Layout';

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: 'text-[#00e699]',
  Medium: 'text-amber-400',
  Hard: 'text-rose-400',
};

export default function GroupDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [weeklyView, setWeeklyView] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    daily_goal: 2,
    weekly_goal: 20,
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['group-dashboard', id],
    queryFn: () => groupApi.dashboard(id!).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: activity } = useQuery({
    queryKey: ['group-activity', id],
    queryFn: () => groupApi.activity(id!, 25).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['group-leaderboard', id, weeklyView],
    queryFn: () => groupApi.leaderboard(id!, weeklyView).then((r) => r.data.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!dashboard) return;
    setSettingsForm({
      name: dashboard.group.name,
      description: dashboard.group.description ?? '',
      daily_goal: dashboard.goals?.daily_goal ?? 2,
      weekly_goal: dashboard.goals?.weekly_goal ?? 20,
    });
  }, [dashboard]);

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      groupApi.updateSettings(id!, {
        name: settingsForm.name,
        description: settingsForm.description,
        daily_goal: settingsForm.daily_goal,
        weekly_goal: settingsForm.weekly_goal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-dashboard', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setEditingSettings(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => groupApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      navigate('/groups');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupApi.leave(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      navigate('/groups');
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00e699] border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!dashboard) {
    return (
      <Layout>
        <Alert type="error">Group not found</Alert>
      </Layout>
    );
  }

  const { group, goals, members, dailyCompletionRate, accountability } = dashboard;
  const isOwner = user?.id === group.owner_id;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link to="/groups" className="hover:text-[#00e699]">Groups</Link>
          <span>/</span>
          <span className="text-gray-200">{group.name}</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <div className="flex flex-wrap justify-end gap-2">
              {isOwner ? (
                <>
                  {editingSettings ? (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => updateSettingsMutation.mutate()}
                        disabled={updateSettingsMutation.isPending}
                        className="flex items-center gap-2 text-xs sm:text-sm px-3 py-2"
                      >
                        <Save className="w-4 h-4" />
                        {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingSettings(false)}
                        className="flex items-center gap-2 text-xs sm:text-sm px-3 py-2"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => setEditingSettings(true)}
                      className="flex items-center gap-2 text-xs sm:text-sm px-3 py-2"
                    >
                      <Pencil className="w-4 h-4" /> Edit Settings
                    </Button>
                  )}

                  {confirmDelete ? (
                    <>
                      <Button
                        variant="danger"
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-2 text-xs sm:text-sm px-3 py-2"
                      >
                        {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs sm:text-sm px-3 py-2"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 text-xs sm:text-sm px-3 py-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Group
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  className="flex items-center gap-2 text-xs sm:text-sm px-3 py-2"
                >
                  <LogOut className="w-4 h-4" />
                  {leaveMutation.isPending ? 'Leaving...' : 'Leave Group'}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            <p className="text-sm text-gray-400">
              Code: {group.group_code} · {dashboard.memberCount} members
            </p>
          </div>
        </div>

        {isOwner && editingSettings && (
          <Card>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Edit Group Settings</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Group Name"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                />
                <Input
                  label="Description"
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                />
                <Input
                  label="Daily Goal"
                  type="number"
                  min={1}
                  value={settingsForm.daily_goal}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, daily_goal: parseInt(e.target.value) })
                  }
                />
                <Input
                  label="Weekly Goal"
                  type="number"
                  min={1}
                  value={settingsForm.weekly_goal}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, weekly_goal: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Daily Goal" value={`${goals?.daily_goal ?? 2}/day`} color="green" />
          <StatCard label="Weekly Goal" value={`${goals?.weekly_goal ?? 20}/wk`} color="blue" />
          <StatCard label="Completion Rate" value={`${dailyCompletionRate}%`} color="yellow" />
          <StatCard label="Members" value={dashboard.memberCount} color="indigo" />
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-white">Live Activity</h2>
            <span className="text-xs text-gray-500 ml-auto">Updates when members sync</span>
          </div>
          {!activity?.length ? (
            <p className="text-gray-500 text-sm">No activity yet. Activity appears when members solve problems and sync.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="p-1.5 rounded-lg bg-[#00e699]/10 border border-[#00e699]/20 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-[#00e699]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium text-[#00e699]">{item.username}</span>
                      {' '}solved{' '}
                      <span className="font-medium">{item.problem_title}</span>
                      {item.difficulty && (
                        <span className={` ml-1 ${DIFFICULTY_STYLE[item.difficulty] ?? ''}`}>
                          ({item.difficulty})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-[#00e699] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Completed Today's Goal
            </h2>
            {accountability.succeededToday.length === 0 ? (
              <p className="text-gray-500 text-sm">No one has completed yet today.</p>
            ) : (
              <div className="space-y-2">
                {accountability.succeededToday.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle2 className="w-4 h-4 text-[#00e699]" />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-4 text-rose-400 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Missed Today's Goal
            </h2>
            {accountability.failedToday.length === 0 ? (
              <p className="text-gray-500 text-sm">No failures yet today.</p>
            ) : (
              <div className="space-y-2">
                {accountability.failedToday.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-sm text-white">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-white mb-2">Member Progress</h2>
          <p className="text-xs text-gray-500 mb-4">
            Each member's progress is based on their local timezone. "Today" may differ between members across regions.
          </p>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.userId} className="glass rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{member.username}</p>
                    <p className="text-xs text-gray-500">
                      {member.leetcodeUsername ?? 'No LeetCode'} · 🔥 {member.currentStreak} day streak
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      📍 {member.timezone} (Today: {member.localDate})
                    </p>
                  </div>
                  <StatusBadge status={member.dailyProgress.status} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Daily: {member.dailyProgress.solved_count}/{member.dailyProgress.goal_target}</span>
                    <span>Weekly: {member.weeklyProgress.solved_count}/{member.weeklyProgress.goal_target}</span>
                  </div>
                  <ProgressBar value={member.dailyProgress.solved_count} max={member.dailyProgress.goal_target} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
            <div className="flex gap-2">
              <Button variant={weeklyView ? 'secondary' : 'primary'} onClick={() => setWeeklyView(false)}>All Time</Button>
              <Button variant={weeklyView ? 'primary' : 'secondary'} onClick={() => setWeeklyView(true)}>Weekly</Button>
            </div>
          </div>
          {!leaderboard?.length ? (
            <p className="text-gray-500 text-sm">No leaderboard data yet.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm md:text-base">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">User</th>
                    <th className="text-right py-2 px-2">Easy</th>
                    <th className="text-right py-2 px-2">Medium</th>
                    <th className="text-right py-2 px-2">Hard</th>
                    <th className="text-right py-2 pl-2">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.username} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-gray-400">{entry.rank}</td>
                      <td className="py-3 pr-4 font-medium text-white">{entry.username}</td>
                      <td className="py-3 px-2 text-right text-[#00e699]">{weeklyView ? entry.weekly_easy : entry.easy_solved}</td>
                      <td className="py-3 px-2 text-right text-amber-400">{weeklyView ? entry.weekly_medium : entry.medium_solved}</td>
                      <td className="py-3 px-2 text-right text-rose-400">{weeklyView ? entry.weekly_hard : entry.hard_solved}</td>
                      <td className="py-3 pl-2 text-right">🔥 {entry.current_streak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
