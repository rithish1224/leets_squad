import { query } from '../db';
import { getWeekStartInTimezone } from '../utils/timezone';
import { User } from '../types';

export async function updateLeaderboardForUser(userId: string): Promise<void> {
  const { rows: userRows } = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  if (userRows.length === 0) return;

  const user = userRows[0];
  const weekStart = getWeekStartInTimezone(user.timezone);

  const { rows: snapshotRows } = await query(
    `SELECT * FROM leetcode_snapshots WHERE user_id = $1 ORDER BY synced_at DESC LIMIT 1`,
    [userId]
  );

  const snapshot = snapshotRows[0] ?? {
    total_solved: 0,
    easy_solved: 0,
    medium_solved: 0,
    hard_solved: 0,
  };

  const { rows: weeklyRows } = await query(
    `SELECT
       COUNT(DISTINCT problem_slug) as weekly_solved,
       COUNT(DISTINCT CASE WHEN difficulty = 'Easy' THEN problem_slug END) as weekly_easy,
       COUNT(DISTINCT CASE WHEN difficulty = 'Medium' THEN problem_slug END) as weekly_medium,
       COUNT(DISTINCT CASE WHEN difficulty = 'Hard' THEN problem_slug END) as weekly_hard
     FROM leetcode_submissions
     WHERE user_id = $1
       AND TO_CHAR(submitted_at AT TIME ZONE $2, 'YYYY-MM-DD') >= $3
       AND TO_CHAR(submitted_at AT TIME ZONE $2, 'YYYY-MM-DD') < ($3::date + INTERVAL '7 days')::date::text`,
    [userId, user.timezone, weekStart]
  );

  const weekly = weeklyRows[0] ?? {
    weekly_solved: 0,
    weekly_easy: 0,
    weekly_medium: 0,
    weekly_hard: 0,
  };

  const { rows: streakRows } = await query(
    'SELECT current_streak FROM streaks WHERE user_id = $1',
    [userId]
  );
  const currentStreak = streakRows[0]?.current_streak ?? 0;

  const values = [
    snapshot.total_solved,
    snapshot.easy_solved,
    snapshot.medium_solved,
    snapshot.hard_solved,
    parseInt(weekly.weekly_solved, 10),
    parseInt(weekly.weekly_easy, 10),
    parseInt(weekly.weekly_medium, 10),
    parseInt(weekly.weekly_hard, 10),
    currentStreak,
  ];

  await upsertLeaderboard(userId, null, values);

  const { rows: memberships } = await query<{ group_id: string }>(
    'SELECT group_id FROM group_members WHERE user_id = $1',
    [userId]
  );

  for (const { group_id } of memberships) {
    await upsertLeaderboard(userId, group_id, values);
  }
}

async function upsertLeaderboard(
  userId: string,
  groupId: string | null,
  values: number[]
): Promise<void> {
  const existing = groupId
    ? await query(
        'SELECT id FROM leaderboards WHERE user_id = $1 AND group_id = $2',
        [userId, groupId]
      )
    : await query(
        'SELECT id FROM leaderboards WHERE user_id = $1 AND group_id IS NULL',
        [userId]
      );

  if (existing.rows.length > 0) {
    if (groupId) {
      await query(
        `UPDATE leaderboards SET
           total_solved = $3, easy_solved = $4, medium_solved = $5, hard_solved = $6,
           weekly_solved = $7, weekly_easy = $8, weekly_medium = $9, weekly_hard = $10,
           current_streak = $11, updated_at = NOW()
         WHERE user_id = $1 AND group_id = $2`,
        [userId, groupId, ...values]
      );
    } else {
      await query(
        `UPDATE leaderboards SET
           total_solved = $2, easy_solved = $3, medium_solved = $4, hard_solved = $5,
           weekly_solved = $6, weekly_easy = $7, weekly_medium = $8, weekly_hard = $9,
           current_streak = $10, updated_at = NOW()
         WHERE user_id = $1 AND group_id IS NULL`,
        [userId, ...values]
      );
    }
  } else {
    await query(
      `INSERT INTO leaderboards
       (user_id, group_id, total_solved, easy_solved, medium_solved, hard_solved,
        weekly_solved, weekly_easy, weekly_medium, weekly_hard, current_streak, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [userId, groupId, ...values]
    );
  }
}

export async function getGlobalLeaderboard(limit = 50) {
  const { rows } = await query(
    `SELECT l.*, u.username,
       ROW_NUMBER() OVER (ORDER BY l.total_solved DESC, l.hard_solved DESC) as rank
     FROM leaderboards l
     JOIN users u ON u.id = l.user_id
     WHERE l.group_id IS NULL
     ORDER BY l.total_solved DESC, l.hard_solved DESC, l.medium_solved DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getWeeklyGlobalLeaderboard(limit = 50) {
  const { rows } = await query(
    `SELECT l.*, u.username,
       ROW_NUMBER() OVER (ORDER BY l.weekly_solved DESC, l.weekly_hard DESC, l.weekly_medium DESC, l.weekly_easy DESC) as rank
     FROM leaderboards l
     JOIN users u ON u.id = l.user_id
     WHERE l.group_id IS NULL
     ORDER BY l.weekly_solved DESC, l.weekly_hard DESC, l.weekly_medium DESC, l.weekly_easy DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getGroupLeaderboard(groupId: string, limit = 50) {
  const { rows } = await query(
    `SELECT l.*, u.username,
       ROW_NUMBER() OVER (ORDER BY l.total_solved DESC, l.hard_solved DESC) as rank
     FROM leaderboards l
     JOIN users u ON u.id = l.user_id
     WHERE l.group_id = $1
     ORDER BY l.total_solved DESC, l.hard_solved DESC, l.medium_solved DESC
     LIMIT $2`,
    [groupId, limit]
  );
  return rows;
}

export async function getGroupWeeklyLeaderboard(groupId: string, limit = 50) {
  const { rows } = await query(
    `SELECT l.*, u.username,
       ROW_NUMBER() OVER (ORDER BY l.weekly_solved DESC, l.weekly_hard DESC, l.weekly_medium DESC, l.weekly_easy DESC) as rank
     FROM leaderboards l
     JOIN users u ON u.id = l.user_id
     WHERE l.group_id = $1
     ORDER BY l.weekly_solved DESC, l.weekly_hard DESC, l.weekly_medium DESC, l.weekly_easy DESC
     LIMIT $2`,
    [groupId, limit]
  );
  return rows;
}

export async function refreshAllLeaderboards(): Promise<void> {
  const { rows: users } = await query<User>(
    `SELECT id FROM users WHERE leetcode_username IS NOT NULL`
  );

  for (const user of users) {
    await updateLeaderboardForUser(user.id);
  }
}
