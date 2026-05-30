import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCw, BarChart3, ArrowRight, Calendar } from 'lucide-react';
import { userApi, analyticsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatAxisDate } from '../utils/dates';
import {
  Layout,
  Card,
  StatCard,
  StatusBadge,
  Button,
  ProgressBar,
  Alert,
} from '../components/Layout';
import { Heatmap } from '../components/Heatmap';

function getSyncError(err: unknown): string {
  const axiosErr = err as { response?: { data?: { error?: string } } };
  return axiosErr?.response?.data?.error ?? 'Sync failed. Check your LeetCode username in Settings.';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => userApi.dashboard().then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => analyticsApi.get(365).then((r) => r.data.data.heatmap),
  });

  const syncMutation = useMutation({
    mutationFn: () => userApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['group-activity'] });
    },
  });

  useEffect(() => {
    if (syncMutation.isSuccess || syncMutation.isError) {
      const timer = setTimeout(() => {
        syncMutation.reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [syncMutation.isSuccess, syncMutation.isError]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#00e699] border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert type="error">Failed to load dashboard</Alert>
      </Layout>
    );
  }

  const { daily, weekly, streak, snapshot, lastSync, recentSubmissions } = data!;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight truncate">
              Welcome back, {user?.username}
            </h1>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || !user?.leetcode_username}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-xs flex-shrink-0"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync LeetCode'}
            </Button>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm truncate">
            LeetCode: {user?.leetcode_username ?? 'Not connected — add in Settings'}
          </p>
        </div>

        {syncMutation.isError && (
          <Alert type="error">{getSyncError(syncMutation.error)}</Alert>
        )}

        {syncMutation.isSuccess && (
          <Alert type="success">LeetCode synced successfully!</Alert>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard label="Current Streak" value={`${streak?.current_streak ?? 0} days`} color="yellow" />
          <StatCard label="Longest Streak" value={`${streak?.longest_streak ?? 0} days`} color="indigo" />
          <StatCard label="Total Solved" value={snapshot?.total_solved ?? 0} color="green" />
          <StatCard
            label="Last Sync"
            value={lastSync ? new Date(lastSync.synced_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            sub={lastSync ? new Date(lastSync.synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-white">Today's Goal</h2>
              <StatusBadge status={daily?.status ?? 'PENDING'} />
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-400">
                  {daily?.solved_count ?? 0} / {daily?.goal_target ?? user?.daily_goal} problems
                </span>
                <span className="text-gray-500">{formatAxisDate(daily?.goal_date)}</span>
              </div>
              <ProgressBar
                value={daily?.solved_count ?? 0}
                max={daily?.goal_target ?? user?.daily_goal ?? 1}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-white">Weekly Goal</h2>
              <StatusBadge status={weekly?.status ?? 'PENDING'} />
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-400">
                  {weekly?.solved_count ?? 0} / {weekly?.goal_target ?? user?.weekly_goal} problems
                </span>
                <span className="text-gray-500">{weekly?.percentage ?? 0}%</span>
              </div>
              <ProgressBar
                value={weekly?.solved_count ?? 0}
                max={weekly?.goal_target ?? user?.weekly_goal ?? 1}
              />
              <p className="text-xs text-gray-500">
                {weekly?.remaining ?? 0} problems remaining this week
              </p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Easy" value={snapshot?.easy_solved ?? 0} color="green" />
          <StatCard label="Medium" value={snapshot?.medium_solved ?? 0} color="yellow" />
          <StatCard label="Hard" value={snapshot?.hard_solved ?? 0} color="red" />
        </div>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-400/10 border border-violet-400/20">
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">Analytics</h2>
                <p className="text-[11px] sm:text-xs text-gray-400 leading-snug">
                  Charts for progress over time, difficulty split & streaks
                </p>
              </div>
            </div>
            <Link to="/analytics">
              <Button variant="secondary" className="flex items-center gap-1 px-3 py-1.5 text-[11px] sm:text-xs whitespace-nowrap">
                Analytics <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#00e699]" />
            <h2 className="text-base sm:text-lg font-semibold text-white">Activity Heatmap</h2>
          </div>
          <Heatmap data={heatmapData ?? []} />
        </Card>

        <Card>
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3">Recent Accepted Problems</h2>
          {recentSubmissions.length === 0 ? (
            <p className="text-gray-500 text-xs sm:text-sm">
              No submissions yet. Sync your LeetCode account to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {recentSubmissions.map((sub, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white">{sub.problem_title}</p>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full border ${
                      sub.difficulty === 'Easy'
                        ? 'bg-[#00e699]/10 text-[#00e699] border-[#00e699]/25'
                        : sub.difficulty === 'Medium'
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/25'
                          : 'bg-rose-400/10 text-rose-400 border-rose-400/25'
                    }`}
                  >
                    {sub.difficulty}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
