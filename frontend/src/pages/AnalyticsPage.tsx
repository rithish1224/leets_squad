import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, TrendingUp, Target, Flame, RefreshCw, Calendar } from 'lucide-react';
import { analyticsApi } from '../lib/api';
import { Layout, Card, PageHeader, Button, StatCard, Alert } from '../components/Layout';
import { Heatmap } from '../components/Heatmap';
import { ChartTooltip } from '../components/ChartTooltip';
import { formatAxisDate, toDateKey } from '../utils/dates';

const DIFFICULTY_COLORS = {
  Easy: '#00e699',
  Medium: '#f59e0b',
  Hard: '#f43f5e',
};

const RANGE_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
] as const;

const chartMargin = { top: 8, right: 8, left: -16, bottom: 0 };

function ChartWrap({ children }: { children: React.ReactNode }) {
  return <div className="w-full h-[280px] min-h-[280px]">{children}</div>;
}

function aggregateMonthly(data: Array<{ date: string; count: string | number }>) {
  const map = new Map<string, number>();
  for (const row of data) {
    const month = toDateKey(row.date).slice(0, 7);
    const count = typeof row.count === 'string' ? parseInt(row.count, 10) : row.count;
    map.set(month, (map.get(month) ?? 0) + count);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: formatAxisDate(`${month}-01`),
      count,
    }));
}

export default function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<number>(90);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', rangeDays],
    queryFn: () => analyticsApi.get(rangeDays).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#00e699] border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <PageHeader title="Analytics" subtitle="Your LeetCode progress visualized" />
        <Alert type="error">Failed to load analytics. Make sure the backend is running.</Alert>
        <Button onClick={() => refetch()} className="mt-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </Layout>
    );
  }

  const solvedOverTime = (data?.solvedOverTime ?? []).map((d) => {
    const raw = toDateKey(d.date);
    return {
      rawDate: raw,
      date: formatAxisDate(raw),
      count: parseInt(String(d.count), 10),
    };
  });

  const difficultyData = (data?.difficultyDistribution ?? []).map((d) => ({
    name: d.difficulty,
    value: parseInt(String(d.count), 10),
    fill: DIFFICULTY_COLORS[d.difficulty as keyof typeof DIFFICULTY_COLORS] ?? '#00e699',
  }));

  const weeklyData = [...(data?.weeklyHistory ?? [])].reverse().map((w) => {
    const raw = toDateKey(w.week_start);
    return {
      rawDate: raw,
      week: formatAxisDate(raw),
      solved: w.solved_count,
      target: w.goal_target,
    };
  });

  const dailyData = [...(data?.dailyHistory ?? [])].reverse().map((d) => {
    const raw = toDateKey(d.goal_date);
    return {
      rawDate: raw,
      date: formatAxisDate(raw),
      solved: d.solved_count,
      target: d.goal_target,
      status: d.status,
    };
  });

  const streakData = (data?.streakHistory ?? []).map((s) => {
    const raw = toDateKey(s.date);
    return {
      rawDate: raw,
      date: formatAxisDate(raw),
      streak: s.streak,
      solved: s.solved,
    };
  });

  const monthlyData = aggregateMonthly(data?.solvedOverTime ?? []);
  const heatmapData = data?.heatmap ?? [];

  const totalSolved = difficultyData.reduce((sum, d) => sum + d.value, 0);
  const bestStreak = Math.max(...streakData.map((s) => s.streak), 0);
  const hasData =
    totalSolved > 0 || solvedOverTime.length > 0 || dailyData.length > 0 || heatmapData.length > 0;

  const rangeLabel = RANGE_OPTIONS.find((r) => r.days === rangeDays)?.label ?? `${rangeDays} days`;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          subtitle={`Charts: ${rangeLabel} · Heatmap: recent 12 weeks`}
          action={
            <div className="flex w-full justify-center gap-2 sm:w-auto sm:justify-end">
              {RANGE_OPTIONS.map(({ label, days }) => (
                <Button
                  key={days}
                  variant={rangeDays === days ? 'primary' : 'secondary'}
                  onClick={() => setRangeDays(days)}
                >
                  {label}
                </Button>
              ))}
            </div>
          }
        />

        {!hasData ? (
          <Card className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">No analytics data yet</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              Sync your LeetCode account from the Dashboard to populate charts.
            </p>
            <Link to="/dashboard">
              <Button>Go to Dashboard & Sync</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard label="Total Problems" value={totalSolved} color="green" />
              <StatCard
                label={`Solved (${rangeLabel})`}
                value={solvedOverTime.reduce((s, d) => s + d.count, 0)}
                color="blue"
              />
              <StatCard label="Best Streak" value={`${bestStreak} days`} color="yellow" />
              <StatCard
                label="Hard Problems"
                value={difficultyData.find((d) => d.name === 'Hard')?.value ?? 0}
                color="red"
              />
            </div>

            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-[#00e699]" />
                <h2 className="text-lg font-semibold text-white">Submission Heatmap</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">Last 12 months — always shown regardless of range filter</p>
              <Heatmap data={heatmapData} />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-[#00e699]" />
                  <h2 className="text-lg font-semibold text-white">Problems Solved Over Time</h2>
                </div>
                {solvedOverTime.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No submission data</p>
                ) : (
                  <ChartWrap>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={solvedOverTime} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="count" stroke="#00e699" fill="rgba(0,230,153,0.12)" strokeWidth={2} name="Solved" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartWrap>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Difficulty Distribution</h2>
                </div>
                {difficultyData.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No difficulty data</p>
                ) : (
                  <ChartWrap>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={difficultyData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {difficultyData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartWrap>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg font-semibold text-white">Daily Progress</h2>
                </div>
                {dailyData.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No daily goal history yet</p>
                ) : (
                  <ChartWrap>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyData} margin={chartMargin} barCategoryGap="15%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} interval="preserveStartEnd" />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                        <Bar dataKey="solved" fill="#00e699" name="Solved" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="target" fill="#64748b" name="Goal" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartWrap>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-semibold text-white">Weekly Progress</h2>
                </div>
                {weeklyData.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No weekly goal history yet</p>
                ) : (
                  <ChartWrap>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData} margin={chartMargin} barCategoryGap="15%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="week" stroke="#6b7280" fontSize={11} tickLine={false} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                        <Bar dataKey="solved" fill="#00e699" name="Solved" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="target" fill="#64748b" name="Goal" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartWrap>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg font-semibold text-white">Monthly Progress</h2>
                </div>
                {monthlyData.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No monthly data yet</p>
                ) : (
                  <ChartWrap>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="month" stroke="#6b7280" fontSize={11} tickLine={false} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" fill="#38bdf8" name="Problems Solved" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartWrap>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Streak History</h2>
                </div>
                {streakData.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No streak history yet</p>
                ) : (
                  <ChartWrap>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={streakData} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} interval="preserveStartEnd" />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="stepAfter" dataKey="streak" stroke="#f59e0b" strokeWidth={2} dot={false} name="Streak" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartWrap>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
