import { query } from '../db';
import { User } from '../types';
import {
  getTodayInTimezone,
  getWeekStartInTimezone,
  utcToDateInTimezone,
} from '../utils/timezone';

type GoalStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

interface DailyGoalLogRow {
  goal_date: string;
  goal_target: number;
  solved_count: number;
  status: GoalStatus;
}

interface WeeklyGoalLogRow {
  week_start: string;
  goal_target: number;
  solved_count: number;
  status: GoalStatus;
}

interface CountRow {
  count: string;
}

interface HeatmapRow {
  date: string;
  count: string;
}

interface SolvedOverTimeRow {
  date: string;
  count: string;
}

interface DifficultyDistributionRow {
  difficulty: string;
  count: string;
}

async function countSolvedOnDate(
  userId: string,
  date: string,
  timezone: string
): Promise<number> {
  const { rows } = await query<CountRow>(
    `SELECT COUNT(DISTINCT problem_slug) as count
     FROM leetcode_submissions
     WHERE user_id = $1
       AND TO_CHAR(submitted_at AT TIME ZONE $2, 'YYYY-MM-DD') = $3`,
    [userId, timezone, date]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

async function countSolvedInWeek(
  userId: string,
  weekStart: string,
  timezone: string
): Promise<number> {
  const { rows } = await query<CountRow>(
    `SELECT COUNT(DISTINCT problem_slug) as count
     FROM leetcode_submissions
     WHERE user_id = $1
       AND TO_CHAR(submitted_at AT TIME ZONE $2, 'YYYY-MM-DD') >= $3
       AND TO_CHAR(submitted_at AT TIME ZONE $2, 'YYYY-MM-DD') < ($3::date + INTERVAL '7 days')::date::text`,
    [userId, timezone, weekStart]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

function determineStatus(
  solved: number,
  target: number,
  isPast: boolean
): GoalStatus {
  if (solved >= target) return 'SUCCESS';
  if (isPast) return 'FAILED';
  return 'PENDING';
}

export async function recalculateGoalsForUser(userId: string): Promise<void> {
  const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) return;

  const user = rows[0];
  const today = getTodayInTimezone(user.timezone);
  const weekStart = getWeekStartInTimezone(user.timezone);

  const todaySolved = await countSolvedOnDate(userId, today, user.timezone);
  const weekSolved = await countSolvedInWeek(userId, weekStart, user.timezone);

  await query(
    `WITH updated AS (
       UPDATE daily_goal_logs
       SET solved_count = $4, status = $5, goal_target = $3, updated_at = NOW()
       WHERE user_id = $1 AND goal_date = $2 AND group_id IS NULL
       RETURNING *
     )
     INSERT INTO daily_goal_logs (user_id, goal_date, goal_target, solved_count, status, group_id)
     SELECT $1, $2, $3, $4, $5, NULL
     WHERE NOT EXISTS (SELECT 1 FROM updated)`,
    [
      userId,
      today,
      user.daily_goal,
      todaySolved,
      determineStatus(todaySolved, user.daily_goal, false),
    ]
  );

  await query(
    `WITH updated AS (
       UPDATE weekly_goal_logs
       SET solved_count = $4, status = $5, goal_target = $3, updated_at = NOW()
       WHERE user_id = $1 AND week_start = $2 AND group_id IS NULL
       RETURNING *
     )
     INSERT INTO weekly_goal_logs (user_id, week_start, goal_target, solved_count, status, group_id)
     SELECT $1, $2, $3, $4, $5, NULL
     WHERE NOT EXISTS (SELECT 1 FROM updated)`,
    [
      userId,
      weekStart,
      user.weekly_goal,
      weekSolved,
      determineStatus(weekSolved, user.weekly_goal, false),
    ]
  );

  const { rows: memberships } = await query<{ group_id: string }>(
    'SELECT group_id FROM group_members WHERE user_id = $1',
    [userId]
  );

  for (const { group_id } of memberships) {
    const { rows: goalRows } = await query<{
      daily_goal: number;
      weekly_goal: number;
    }>(
      `SELECT daily_goal, weekly_goal FROM group_goals
       WHERE group_id = $1 ORDER BY effective_from DESC LIMIT 1`,
      [group_id]
    );

    if (goalRows.length === 0) continue;

    const { daily_goal, weekly_goal } = goalRows[0];

    await query(
      `INSERT INTO daily_goal_logs (user_id, goal_date, goal_target, solved_count, status, group_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, goal_date, group_id)
       DO UPDATE SET
         solved_count = EXCLUDED.solved_count,
         status = EXCLUDED.status,
         goal_target = EXCLUDED.goal_target,
         updated_at = NOW()`,
      [
        userId,
        today,
        daily_goal,
        todaySolved,
        determineStatus(todaySolved, daily_goal, false),
        group_id,
      ]
    );

    await query(
      `INSERT INTO weekly_goal_logs (user_id, week_start, goal_target, solved_count, status, group_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, week_start, group_id)
       DO UPDATE SET
         solved_count = EXCLUDED.solved_count,
         status = EXCLUDED.status,
         goal_target = EXCLUDED.goal_target,
         updated_at = NOW()`,
      [
        userId,
        weekStart,
        weekly_goal,
        weekSolved,
        determineStatus(weekSolved, weekly_goal, false),
        group_id,
      ]
    );
  }

  await finalizePastGoals(userId, user.timezone);
}

async function finalizePastGoals(userId: string, timezone: string): Promise<void> {
  const today = getTodayInTimezone(timezone);

  await query(
    `UPDATE daily_goal_logs
     SET status = CASE
       WHEN solved_count >= goal_target THEN 'SUCCESS'
       ELSE 'FAILED'
     END,
     updated_at = NOW()
     WHERE user_id = $1 AND goal_date < $2 AND status = 'PENDING'`,
    [userId, today]
  );

  const weekStart = getWeekStartInTimezone(timezone);
  await query(
    `UPDATE weekly_goal_logs
     SET status = CASE
       WHEN solved_count >= goal_target THEN 'SUCCESS'
       ELSE 'FAILED'
     END,
     updated_at = NOW()
     WHERE user_id = $1 AND week_start < $2 AND status = 'PENDING'`,
    [userId, weekStart]
  );
}

export async function getDailyProgress(userId: string): Promise<DailyGoalLogRow | null> {
  const { rows: userRows } = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  if (userRows.length === 0) return null;

  const user = userRows[0];
  const today = getTodayInTimezone(user.timezone);

  const { rows } = await query<DailyGoalLogRow>(
    `SELECT * FROM daily_goal_logs
     WHERE user_id = $1 AND goal_date = $2 AND group_id IS NULL`,
    [userId, today]
  );

  if (rows[0]) {
    rows[0].goal_date = today;
  }

  return rows[0] ?? {
    goal_date: today,
    goal_target: user.daily_goal,
    solved_count: 0,
    status: 'PENDING',
  };
}

export async function getWeeklyProgress(userId: string): Promise<
  | (WeeklyGoalLogRow & { remaining: number; percentage: number })
  | null
> {
  const { rows: userRows } = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  if (userRows.length === 0) return null;

  const user = userRows[0];
  const weekStart = getWeekStartInTimezone(user.timezone);

  const { rows } = await query<WeeklyGoalLogRow>(
    `SELECT * FROM weekly_goal_logs
     WHERE user_id = $1 AND week_start = $2 AND group_id IS NULL`,
    [userId, weekStart]
  );

  if (rows[0]) {
    rows[0].week_start = weekStart;
  }

  const log: WeeklyGoalLogRow = rows[0] ?? {
    week_start: weekStart,
    goal_target: user.weekly_goal,
    solved_count: 0,
    status: 'PENDING',
  };

  return {
    ...log,
    remaining: Math.max(0, log.goal_target - log.solved_count),
    percentage: Math.min(100, Math.round((log.solved_count / log.goal_target) * 100)),
  };
}

export async function getDailyGoalHistory(userId: string, days = 30): Promise<DailyGoalLogRow[]> {
  const { rows } = await query<DailyGoalLogRow>(
    `SELECT TO_CHAR(goal_date, 'YYYY-MM-DD') as goal_date, goal_target, solved_count, status
     FROM daily_goal_logs
     WHERE user_id = $1 AND group_id IS NULL
     ORDER BY goal_date DESC
     LIMIT $2`,
    [userId, days]
  );

  return rows.map((r) => ({
    goal_date: String(r.goal_date),
    goal_target: r.goal_target,
    solved_count: r.solved_count,
    status: r.status,
  }));
}

export async function getWeeklyGoalHistory(userId: string, weeks = 12): Promise<WeeklyGoalLogRow[]> {
  const { rows } = await query<WeeklyGoalLogRow>(
    `SELECT TO_CHAR(week_start, 'YYYY-MM-DD') as week_start, goal_target, solved_count, status
     FROM weekly_goal_logs
     WHERE user_id = $1 AND group_id IS NULL
     ORDER BY week_start DESC
     LIMIT $2`,
    [userId, weeks]
  );
  return rows.map((r) => ({
    week_start: String(r.week_start),
    goal_target: r.goal_target,
    solved_count: r.solved_count,
    status: r.status,
  }));
}

export async function getHeatmapData(userId: string, days = 365): Promise<Array<{ date: string; count: number }>> {
  const { rows: userRows } = await query<User>(
    'SELECT timezone FROM users WHERE id = $1',
    [userId]
  );
  const timezone = userRows[0]?.timezone ?? 'UTC';

  const { rows } = await query<HeatmapRow>(
    `SELECT
       TO_CHAR(submitted_at AT TIME ZONE $2, 'YYYY-MM-DD') as date,
       COUNT(DISTINCT problem_slug) as count
     FROM leetcode_submissions
     WHERE user_id = $1
       AND submitted_at >= NOW() - ($3 || ' days')::INTERVAL
     GROUP BY date
     ORDER BY date ASC`,
    [userId, timezone, String(days)]
  );

  return rows.map((r) => ({
    date: String(r.date),
    count: parseInt(String(r.count), 10),
  }));
}

export async function getSolvedOverTime(userId: string, days = 30): Promise<Array<{ date: string; count: number }>> {
  const { rows: userRows } = await query<User>(
    'SELECT timezone FROM users WHERE id = $1',
    [userId]
  );
  const timezone = userRows[0]?.timezone ?? 'UTC';

  const { rows } = await query<SolvedOverTimeRow>(
    `SELECT
       TO_CHAR(submitted_at AT TIME ZONE $2, 'YYYY-MM-DD') as date,
       COUNT(DISTINCT problem_slug) as count
     FROM leetcode_submissions
     WHERE user_id = $1
       AND submitted_at >= NOW() - ($3 * INTERVAL '1 day')
     GROUP BY date
     ORDER BY date ASC`,
    [userId, timezone, days]
  );

  return rows.map((r) => ({
    date: String(r.date),
    count: parseInt(String(r.count), 10),
  }));
}

export async function getDifficultyDistribution(userId: string): Promise<Array<{ difficulty: string; count: number }>> {
  const { rows } = await query<DifficultyDistributionRow>(
    `SELECT difficulty, COUNT(DISTINCT problem_slug) as count
     FROM leetcode_submissions
     WHERE user_id = $1
     GROUP BY difficulty`,
    [userId]
  );
  return rows.map((r) => ({
    difficulty: String(r.difficulty),
    count: parseInt(String(r.count), 10),
  }));
}

export { utcToDateInTimezone };
