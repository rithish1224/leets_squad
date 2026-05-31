import { query } from '../db';
import { User, Streak } from '../types';
import { getTodayInTimezone } from '../utils/timezone';
import { subDays, parseISO, differenceInCalendarDays } from 'date-fns';

export async function recalculateStreakForUser(userId: string): Promise<Streak> {
  const { rows: userRows } = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  if (userRows.length === 0) throw new Error('User not found');

  const user = userRows[0];
  const timezone = user.timezone;
  const today = getTodayInTimezone(timezone);

  const { rows: dailyLogs } = await query<{
    goal_date: string;
    status: string;
  }>(
    `SELECT TO_CHAR(goal_date, 'YYYY-MM-DD') as goal_date, status FROM daily_goal_logs
     WHERE user_id = $1 AND group_id IS NULL
     ORDER BY goal_date DESC
     LIMIT 365`,
    [userId]
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastSuccessDate: string | null = null;

  const logMap = new Map(dailyLogs.map((l) => [l.goal_date, l.status]));

  let checkDate = today;
  let foundToday = logMap.has(today);

  if (foundToday) {
    const todayStatus = logMap.get(today);
    if (todayStatus === 'SUCCESS') {
      currentStreak = 1;
      lastSuccessDate = today;
      checkDate = formatDateSub(checkDate, 1);
    } else if (todayStatus === 'PENDING') {
      checkDate = formatDateSub(today, 1);
    } else {
      currentStreak = 0;
    }
  } else {
    checkDate = formatDateSub(today, 1);
  }

  while (true) {
    const status = logMap.get(checkDate);
    if (status === 'SUCCESS') {
      currentStreak++;
      if (!lastSuccessDate) lastSuccessDate = checkDate;
      checkDate = formatDateSub(checkDate, 1);
    } else if (status === 'FAILED') {
      break;
    } else if (status === 'PENDING') {
      break;
    } else {
      break;
    }
  }

  const sortedDates = dailyLogs
    .filter((l) => l.status === 'SUCCESS')
    .map((l) => l.goal_date)
    .sort();

  tempStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = parseISO(sortedDates[i - 1]);
      const curr = parseISO(sortedDates[i]);
      if (differenceInCalendarDays(curr, prev) === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  const { rows } = await query<Streak>(
    `INSERT INTO streaks (user_id, current_streak, longest_streak, last_success_date, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       current_streak = EXCLUDED.current_streak,
       longest_streak = GREATEST(streaks.longest_streak, EXCLUDED.longest_streak),
       last_success_date = EXCLUDED.last_success_date,
       updated_at = NOW()
     RETURNING *`,
    [userId, currentStreak, longestStreak, lastSuccessDate]
  );

  return rows[0];
}

function formatDateSub(dateStr: string, days: number): string {
  const d = subDays(parseISO(dateStr), days);
  return d.toISOString().split('T')[0];
}

export async function getStreakForUser(userId: string): Promise<Streak | null> {
  const { rows } = await query<Streak>(
    'SELECT * FROM streaks WHERE user_id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

export async function getStreakHistory(userId: string, days = 90) {
  const { rows } = await query(
    `SELECT goal_date, solved_count, status
     FROM daily_goal_logs
     WHERE user_id = $1 AND group_id IS NULL
     ORDER BY goal_date DESC
     LIMIT $2`,
    [userId, days]
  );

  let runningStreak = 0;
  const history = rows.reverse().map((log) => {
    if (log.status === 'SUCCESS') {
      runningStreak++;
    } else if (log.status === 'FAILED') {
      runningStreak = 0;
    }
    const dateStr =
      log.goal_date instanceof Date
        ? log.goal_date.toISOString().slice(0, 10)
        : String(log.goal_date).slice(0, 10);
    return {
      date: dateStr,
      solved: log.solved_count,
      status: log.status,
      streak: runningStreak,
    };
  });

  return history;
}
