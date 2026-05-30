import { query } from '../db';
import { AppError } from '../utils/errors';

export interface GroupActivityItem {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  activity_type: 'PROBLEM_SOLVED' | 'GOAL_COMPLETED' | 'SYNC';
  problem_title: string | null;
  problem_slug: string | null;
  difficulty: string | null;
  message: string | null;
  created_at: Date;
}

export async function recordProblemSolvedActivity(
  userId: string,
  problem: {
    title: string;
    slug: string;
    difficulty: string;
  }
): Promise<void> {
  const { rows: memberships } = await query<{ group_id: string }>(
    'SELECT group_id FROM group_members WHERE user_id = $1',
    [userId]
  );

  const { rows: userRows } = await query<{ username: string }>(
    'SELECT username FROM users WHERE id = $1',
    [userId]
  );
  const username = userRows[0]?.username ?? 'User';

  for (const { group_id } of memberships) {
    await query(
      `INSERT INTO group_activity
       (group_id, user_id, activity_type, problem_title, problem_slug, difficulty, message)
       VALUES ($1, $2, 'PROBLEM_SOLVED', $3, $4, $5, $6)`,
      [
        group_id,
        userId,
        problem.title,
        problem.slug,
        problem.difficulty,
        `${username} solved ${problem.title}`,
      ]
    );
  }
}

export async function getGroupActivity(
  groupId: string,
  limit = 30
): Promise<GroupActivityItem[]> {
  const { rows } = await query<GroupActivityItem>(
    `SELECT ga.*, u.username
     FROM group_activity ga
     JOIN users u ON u.id = ga.user_id
     WHERE ga.group_id = $1
     ORDER BY ga.created_at DESC
     LIMIT $2`,
    [groupId, limit]
  );
  return rows;
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const { rows } = await query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return rows.length > 0;
}
