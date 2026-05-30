import { query } from '../db';
import { Group, GroupGoal } from '../types';
import { generateGroupCode } from '../utils/timezone';
import { AppError } from '../utils/errors';
import { getTodayInTimezone, getWeekStartInTimezone } from '../utils/timezone';
import { User } from '../types';

type GoalStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

interface GoalLogRow {
  goal_target: number;
  solved_count: number;
  status: GoalStatus;
}

interface StreakRow {
  current_streak: number;
}

interface GroupDashboardMemberProgress {
  userId: string;
  username: string;
  leetcodeUsername: string | null;
  timezone: string;
  localDate: string;
  dailyProgress: GoalLogRow;
  weeklyProgress: GoalLogRow;
  currentStreak: number;
}

interface GroupDashboardResponse {
  group: Group;
  goals: GroupGoal | null;
  members: GroupDashboardMemberProgress[];
  memberCount: number;
  dailyCompletionRate: number;
  accountability: {
    succeededToday: string[];
    failedToday: string[];
    weeklySucceeded: string[];
    weeklyFailed: string[];
  };
}

export async function createGroup(
  ownerId: string,
  data: { name: string; description?: string; daily_goal?: number; weekly_goal?: number }
): Promise<Group> {
  let groupCode = generateGroupCode();
  let attempts = 0;

  while (attempts < 10) {
    const existing = await query('SELECT id FROM groups WHERE group_code = $1', [groupCode]);
    if (existing.rows.length === 0) break;
    groupCode = generateGroupCode();
    attempts++;
  }

  const { rows } = await query<Group>(
    `INSERT INTO groups (name, description, group_code, owner_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.description ?? null, groupCode, ownerId]
  );

  const group = rows[0];

  await query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)`,
    [group.id, ownerId]
  );

  await query(
    `INSERT INTO group_goals (group_id, daily_goal, weekly_goal)
     VALUES ($1, $2, $3)`,
    [group.id, data.daily_goal ?? 2, data.weekly_goal ?? 20]
  );

  return group;
}

export async function joinGroup(userId: string, groupCode: string): Promise<Group> {
  const { rows: groupRows } = await query<Group>(
    'SELECT * FROM groups WHERE group_code = $1',
    [groupCode.toUpperCase()]
  );

  if (groupRows.length === 0) {
    throw new AppError(404, 'Group not found with that code');
  }

  const group = groupRows[0];

  const existing = await query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [group.id, userId]
  );

  if (existing.rows.length > 0) {
    throw new AppError(409, 'Already a member of this group');
  }

  await query(
    'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
    [group.id, userId]
  );

  return group;
}

export async function getUserGroups(userId: string) {
  const { rows } = await query(
    `SELECT g.*, gm.joined_at,
       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getGroupById(groupId: string) {
  const { rows } = await query<Group>(
    'SELECT * FROM groups WHERE id = $1',
    [groupId]
  );
  return rows[0] ?? null;
}

export async function getGroupMembers(groupId: string) {
  const { rows } = await query(
    `SELECT u.id, u.username, u.leetcode_username, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC`,
    [groupId]
  );
  return rows;
}

export async function getGroupGoals(groupId: string): Promise<GroupGoal | null> {
  const { rows } = await query<GroupGoal>(
    `SELECT * FROM group_goals WHERE group_id = $1 ORDER BY effective_from DESC LIMIT 1`,
    [groupId]
  );
  return rows[0] ?? null;
}

export async function updateGroupGoals(
  groupId: string,
  ownerId: string,
  goals: { daily_goal?: number; weekly_goal?: number }
) {
  const group = await getGroupById(groupId);
  if (!group) throw new AppError(404, 'Group not found');
  if (group.owner_id !== ownerId) throw new AppError(403, 'Only group owner can update goals');

  const current = await getGroupGoals(groupId);

  await query(
    `INSERT INTO group_goals (group_id, daily_goal, weekly_goal)
     VALUES ($1, $2, $3)`,
    [
      groupId,
      goals.daily_goal ?? current?.daily_goal ?? 2,
      goals.weekly_goal ?? current?.weekly_goal ?? 20,
    ]
  );

  return getGroupGoals(groupId);
}

export async function updateGroupSettings(
  groupId: string,
  ownerId: string,
  settings: {
    name?: string;
    description?: string;
    daily_goal?: number;
    weekly_goal?: number;
  }
) {
  const group = await getGroupById(groupId);
  if (!group) throw new AppError(404, 'Group not found');
  if (group.owner_id !== ownerId) throw new AppError(403, 'Only group owner can update settings');

  const currentGoals = await getGroupGoals(groupId);

  if (settings.name !== undefined || settings.description !== undefined) {
    await query(
      `UPDATE groups
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3`,
      [settings.name ?? null, settings.description ?? null, groupId]
    );
  }

  if (settings.daily_goal !== undefined || settings.weekly_goal !== undefined) {
    await query(
      `INSERT INTO group_goals (group_id, daily_goal, weekly_goal)
       VALUES ($1, $2, $3)` ,
      [
        groupId,
        settings.daily_goal ?? currentGoals?.daily_goal ?? 2,
        settings.weekly_goal ?? currentGoals?.weekly_goal ?? 20,
      ]
    );
  }

  return {
    group: await getGroupById(groupId),
    goals: await getGroupGoals(groupId),
  };
}

export async function getGroupDashboard(groupId: string): Promise<GroupDashboardResponse> {
  const group = await getGroupById(groupId);
  if (!group) throw new AppError(404, 'Group not found');

  const members = await getGroupMembers(groupId);
  const goals = await getGroupGoals(groupId);

  const memberProgress = await Promise.all(
    members.map(async (member) => {
      const { rows: userRows } = await query<User>(
        'SELECT * FROM users WHERE id = $1',
        [member.id]
      );
      const user = userRows[0];
      const today = getTodayInTimezone(user.timezone);
      const weekStart = getWeekStartInTimezone(user.timezone);

      const { rows: dailyRows } = await query<GoalLogRow>(
        `SELECT * FROM daily_goal_logs
         WHERE user_id = $1 AND group_id = $2 AND goal_date = $3`,
        [member.id, groupId, today]
      );

      const { rows: weeklyRows } = await query<GoalLogRow>(
        `SELECT * FROM weekly_goal_logs
         WHERE user_id = $1 AND group_id = $2 AND week_start = $3`,
        [member.id, groupId, weekStart]
      );

      const { rows: streakRows } = await query<StreakRow>(
        'SELECT current_streak FROM streaks WHERE user_id = $1',
        [member.id]
      );

      return {
        userId: member.id,
        username: member.username,
        leetcodeUsername: member.leetcode_username,
        timezone: user.timezone,
        localDate: today,
        dailyProgress: dailyRows[0] ?? {
          goal_target: goals?.daily_goal ?? 2,
          solved_count: 0,
          status: 'PENDING',
        },
        weeklyProgress: weeklyRows[0] ?? {
          goal_target: goals?.weekly_goal ?? 20,
          solved_count: 0,
          status: 'PENDING',
        },
        currentStreak: streakRows[0]?.current_streak ?? 0,
      };
    })
  );

  const dailyCompletionRate =
    memberProgress.length > 0
      ? Math.round(
          (memberProgress.filter((m) => m.dailyProgress.status === 'SUCCESS').length /
            memberProgress.length) *
            100
        )
      : 0;

  const failedToday = memberProgress
    .filter((m) => m.dailyProgress.status === 'FAILED')
    .map((m) => m.username);

  const succeededToday = memberProgress
    .filter((m) => m.dailyProgress.status === 'SUCCESS')
    .map((m) => m.username);

  const weeklyFailed = memberProgress
    .filter((m) => m.weeklyProgress.status === 'FAILED')
    .map((m) => m.username);

  const weeklySucceeded = memberProgress
    .filter((m) => m.weeklyProgress.status === 'SUCCESS')
    .map((m) => m.username);

  return {
    group,
    goals,
    members: memberProgress,
    memberCount: members.length,
    dailyCompletionRate,
    accountability: {
      succeededToday,
      failedToday,
      weeklySucceeded,
      weeklyFailed,
    },
  };
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  const group = await getGroupById(groupId);
  if (!group) throw new AppError(404, 'Group not found');

  if (group.owner_id === userId) {
    throw new AppError(400, 'Group owner cannot leave. Delete the group instead.');
  }

  await query(
    'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
}

export async function deleteGroup(groupId: string, ownerId: string): Promise<void> {
  const group = await getGroupById(groupId);
  if (!group) throw new AppError(404, 'Group not found');
  if (group.owner_id !== ownerId) {
    throw new AppError(403, 'Only the group owner can delete this group');
  }

  await query('DELETE FROM groups WHERE id = $1', [groupId]);
}
