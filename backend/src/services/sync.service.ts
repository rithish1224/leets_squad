import { query } from '../db';
import {
  fetchProfile,
  fetchAllRecentSubmissions,
  enrichSubmissionsWithDifficulty,
} from './leetcode.service';
import { recalculateGoalsForUser } from './goals.service';
import { recalculateStreakForUser } from './streak.service';
import { updateLeaderboardForUser } from './leaderboard.service';
import { recordProblemSolvedActivity } from './activity.service';
import { User } from '../types';
import { AppError } from '../utils/errors';

export async function syncUserLeetCode(userId: string): Promise<{
  snapshot: {
    total_solved: number;
    easy_solved: number;
    medium_solved: number;
    hard_solved: number;
  };
  newSubmissions: number;
  syncedAt: Date;
}> {
  const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);

  if (rows.length === 0) throw new AppError(404, 'User not found');

  const user = rows[0];

  if (!user.leetcode_username) {
    throw new AppError(400, 'LeetCode username not configured');
  }

  try {
    const profile = await fetchProfile(user.leetcode_username);
    const rawSubmissions = await fetchAllRecentSubmissions(user.leetcode_username, 200);
    const submissions = await enrichSubmissionsWithDifficulty(rawSubmissions);

    const { rows: snapshotRows } = await query(
      `INSERT INTO leetcode_snapshots (user_id, total_solved, easy_solved, medium_solved, hard_solved, ranking)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        profile.totalSolved,
        profile.easySolved,
        profile.mediumSolved,
        profile.hardSolved,
        profile.ranking,
      ]
    );

    let newSubmissions = 0;

    for (const sub of submissions) {
      const submittedAt = new Date(parseInt(sub.timestamp, 10) * 1000);
      const result = await query(
        `INSERT INTO leetcode_submissions
         (user_id, leetcode_submission_id, problem_title, problem_slug, difficulty, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, leetcode_submission_id) DO NOTHING
         RETURNING id`,
        [
          userId,
          `${sub.titleSlug}-${sub.timestamp}`,
          sub.title,
          sub.titleSlug,
          sub.difficulty,
          submittedAt,
        ]
      );

      if (result.rows.length > 0) {
        newSubmissions++;
        await recordProblemSolvedActivity(userId, {
          title: sub.title,
          slug: sub.titleSlug,
          difficulty: sub.difficulty,
        });
      }
    }

    await recalculateGoalsForUser(userId);
    await recalculateStreakForUser(userId);
    await updateLeaderboardForUser(userId);

    await query(
      `INSERT INTO sync_logs (user_id, status, message) VALUES ($1, 'SUCCESS', $2)`,
      [userId, `Synced ${newSubmissions} new submissions`]
    );

    return {
      snapshot: {
        total_solved: snapshotRows[0].total_solved,
        easy_solved: snapshotRows[0].easy_solved,
        medium_solved: snapshotRows[0].medium_solved,
        hard_solved: snapshotRows[0].hard_solved,
      },
      newSubmissions,
      syncedAt: snapshotRows[0].synced_at,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    await query(
      `INSERT INTO sync_logs (user_id, status, message) VALUES ($1, 'FAILED', $2)`,
      [userId, message]
    );
    throw new AppError(502, `LeetCode sync failed: ${message}`);
  }
}

export async function syncAllUsers(): Promise<{ synced: number; failed: number }> {
  const { rows: users } = await query<User>(
    `SELECT * FROM users WHERE leetcode_username IS NOT NULL AND leetcode_username != ''`
  );

  let synced = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await syncUserLeetCode(user.id);
      synced++;
    } catch (error) {
      failed++;
      console.error(`Sync failed for user ${user.username}:`, error);
    }
  }

  return { synced, failed };
}

export async function getLastSyncLog(userId: string) {
  const { rows } = await query(
    `SELECT * FROM sync_logs WHERE user_id = $1 ORDER BY synced_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getLatestSnapshot(userId: string) {
  const { rows } = await query(
    `SELECT * FROM leetcode_snapshots WHERE user_id = $1 ORDER BY synced_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getRecentSubmissions(userId: string, limit = 10) {
  const { rows } = await query(
    `SELECT problem_title, problem_slug, difficulty, submitted_at
     FROM leetcode_submissions
     WHERE user_id = $1
     ORDER BY submitted_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}
