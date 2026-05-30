export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  leetcode_username: string | null;
  timezone: string;
  daily_goal: number;
  weekly_goal: number;
  reset_otp: string | null;
  reset_otp_expires: Date | null;
  reset_otp_attempts: number;
  reset_token: string | null;
  reset_token_expires: Date | null;
  created_at: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  leetcode_username: string | null;
  timezone: string;
  daily_goal: number;
  weekly_goal: number;
  created_at: Date;
}

export interface LeetCodeSnapshot {
  id: string;
  user_id: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  ranking: number | null;
  synced_at: Date;
}

export interface LeetCodeSubmission {
  id: string;
  user_id: string;
  leetcode_submission_id: string;
  problem_title: string;
  problem_slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  submitted_at: Date;
}

export interface DailyGoalLog {
  id: string;
  user_id: string;
  goal_date: string;
  goal_target: number;
  solved_count: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  group_id: string | null;
}

export interface WeeklyGoalLog {
  id: string;
  user_id: string;
  week_start: string;
  goal_target: number;
  solved_count: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  group_id: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  group_code: string;
  owner_id: string;
  created_at: Date;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: Date;
}

export interface GroupGoal {
  id: string;
  group_id: string;
  daily_goal: number;
  weekly_goal: number;
  effective_from: string;
}

export interface SyncLog {
  id: string;
  user_id: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  message: string | null;
  synced_at: Date;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_success_date: string | null;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  group_id: string | null;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  weekly_solved: number;
  weekly_easy: number;
  weekly_medium: number;
  weekly_hard: number;
  current_streak: number;
  username?: string;
  rank?: number;
}

export interface JwtPayload {
  userId: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
