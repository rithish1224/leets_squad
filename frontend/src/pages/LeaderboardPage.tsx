import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '../lib/api';
import { Layout, Card, Button } from '../components/Layout';

export default function LeaderboardPage() {
  const [weekly, setWeekly] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['leaderboard', weekly],
    queryFn: () => leaderboardApi.global(weekly).then((r) => r.data.data),
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Global Leaderboard</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Rankings across all LeetSquad users
            </p>
          </div>
          <div className="flex gap-2 text-xs sm:text-sm">
            <Button
              variant={weekly ? 'secondary' : 'primary'}
              onClick={() => setWeekly(false)}
              className="px-3 py-2 sm:px-5 sm:py-2.5"
            >
              All Time
            </Button>
            <Button
              variant={weekly ? 'primary' : 'secondary'}
              onClick={() => setWeekly(true)}
              className="px-3 py-2 sm:px-5 sm:py-2.5"
            >
              This Week
            </Button>
          </div>
        </div>

        <Card>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : !entries?.length ? (
            <p className="text-gray-500 text-center py-8">
              No leaderboard data yet. Sync your LeetCode account to appear here.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {entries.map((entry) => (
                  <div
                    key={entry.username}
                    className="rounded-2xl border border-gray-800/70 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold flex-shrink-0 ${
                              entry.rank === 1
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : entry.rank === 2
                                  ? 'bg-gray-400/20 text-gray-300'
                                  : entry.rank === 3
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'text-gray-500'
                            }`}
                          >
                            {entry.rank}
                          </span>
                          <p className="font-medium text-sm truncate">{entry.username}</p>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Streak {entry.current_streak} {entry.current_streak === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-gray-400 flex-shrink-0">
                        {weekly ? 'Weekly' : 'All time'}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-4 text-center text-[11px]">
                      <div className="rounded-xl bg-black/30 border border-white/5 py-2">
                        <div className="text-gray-500">Easy</div>
                        <div className="text-green-400 font-semibold mt-0.5">
                          {weekly ? entry.weekly_easy : entry.easy_solved}
                        </div>
                      </div>
                      <div className="rounded-xl bg-black/30 border border-white/5 py-2">
                        <div className="text-gray-500">Med</div>
                        <div className="text-yellow-400 font-semibold mt-0.5">
                          {weekly ? entry.weekly_medium : entry.medium_solved}
                        </div>
                      </div>
                      <div className="rounded-xl bg-black/30 border border-white/5 py-2">
                        <div className="text-gray-500">Hard</div>
                        <div className="text-red-400 font-semibold mt-0.5">
                          {weekly ? entry.weekly_hard : entry.hard_solved}
                        </div>
                      </div>
                      <div className="rounded-xl bg-black/30 border border-white/5 py-2">
                        <div className="text-gray-500">Total</div>
                        <div className="text-indigo-400 font-semibold mt-0.5">
                          {weekly ? entry.weekly_solved : entry.total_solved}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <table className="w-full text-sm md:text-base">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="text-left py-3 pr-3 text-xs lg:text-sm">Rank</th>
                      <th className="text-left py-3 pr-3 text-xs lg:text-sm">Username</th>
                      <th className="text-right py-3 px-2 text-xs lg:text-sm">Easy</th>
                      <th className="text-right py-3 px-2 text-xs lg:text-sm">Medium</th>
                      <th className="text-right py-3 px-2 text-xs lg:text-sm">Hard</th>
                      <th className="text-right py-3 px-2 text-xs lg:text-sm">Weekly</th>
                      <th className="text-right py-3 pl-2 text-xs lg:text-sm">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr
                        key={entry.username}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30"
                      >
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                              entry.rank === 1
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : entry.rank === 2
                                  ? 'bg-gray-400/20 text-gray-300'
                                  : entry.rank === 3
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'text-gray-500'
                            }`}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-medium text-sm lg:text-base max-w-[160px] truncate">
                          {entry.username}
                        </td>
                        <td className="py-3 px-2 text-right text-green-400 text-sm lg:text-base">
                          {weekly ? entry.weekly_easy : entry.easy_solved}
                        </td>
                        <td className="py-3 px-2 text-right text-yellow-400 text-sm lg:text-base">
                          {weekly ? entry.weekly_medium : entry.medium_solved}
                        </td>
                        <td className="py-3 px-2 text-right text-red-400 text-sm lg:text-base">
                          {weekly ? entry.weekly_hard : entry.hard_solved}
                        </td>
                        <td className="py-3 px-2 text-right text-indigo-400 text-sm lg:text-base">
                          {weekly ? entry.weekly_solved : entry.total_solved}
                        </td>
                        <td className="py-3 pl-2 text-right text-sm lg:text-base">
                          🔥 {entry.current_streak}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
