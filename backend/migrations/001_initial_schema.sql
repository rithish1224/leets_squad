-- DSA Accountability Platform - Initial Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  leetcode_username VARCHAR(100),
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  daily_goal INTEGER NOT NULL DEFAULT 2 CHECK (daily_goal > 0),
  weekly_goal INTEGER NOT NULL DEFAULT 20 CHECK (weekly_goal > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_leetcode_username ON users(leetcode_username);

-- LeetCode snapshots (point-in-time stats)
CREATE TABLE leetcode_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_solved INTEGER NOT NULL DEFAULT 0,
  easy_solved INTEGER NOT NULL DEFAULT 0,
  medium_solved INTEGER NOT NULL DEFAULT 0,
  hard_solved INTEGER NOT NULL DEFAULT 0,
  ranking INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leetcode_snapshots_user_id ON leetcode_snapshots(user_id);
CREATE INDEX idx_leetcode_snapshots_synced_at ON leetcode_snapshots(user_id, synced_at DESC);

-- Individual accepted submissions from LeetCode
CREATE TABLE leetcode_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leetcode_submission_id VARCHAR(100) NOT NULL,
  problem_title VARCHAR(255) NOT NULL,
  problem_slug VARCHAR(255) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, leetcode_submission_id)
);

CREATE INDEX idx_leetcode_submissions_user_id ON leetcode_submissions(user_id);
CREATE INDEX idx_leetcode_submissions_submitted_at ON leetcode_submissions(user_id, submitted_at DESC);
CREATE INDEX idx_leetcode_submissions_difficulty ON leetcode_submissions(user_id, difficulty);

-- Daily goal logs
CREATE TABLE daily_goal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_date DATE NOT NULL,
  goal_target INTEGER NOT NULL,
  solved_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, goal_date, group_id)
);

CREATE INDEX idx_daily_goal_logs_user_date ON daily_goal_logs(user_id, goal_date DESC);
CREATE INDEX idx_daily_goal_logs_group_date ON daily_goal_logs(group_id, goal_date DESC);

-- Weekly goal logs
CREATE TABLE weekly_goal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  goal_target INTEGER NOT NULL,
  solved_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start, group_id)
);

CREATE INDEX idx_weekly_goal_logs_user_week ON weekly_goal_logs(user_id, week_start DESC);
CREATE INDEX idx_weekly_goal_logs_group_week ON weekly_goal_logs(group_id, week_start DESC);

-- Groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  group_code VARCHAR(20) NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_owner_id ON groups(owner_id);
CREATE INDEX idx_groups_group_code ON groups(group_code);

-- Group members
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Group goals
CREATE TABLE group_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  daily_goal INTEGER NOT NULL DEFAULT 2 CHECK (daily_goal > 0),
  weekly_goal INTEGER NOT NULL DEFAULT 20 CHECK (weekly_goal > 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_goals_group_id ON group_goals(group_id);

-- Add FK for group_id in goal logs after groups table exists
ALTER TABLE daily_goal_logs
  ADD CONSTRAINT fk_daily_goal_logs_group
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

ALTER TABLE weekly_goal_logs
  ADD CONSTRAINT fk_weekly_goal_logs_group
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Sync logs
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
  message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id, synced_at DESC);

-- Streaks
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_success_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_streaks_current ON streaks(current_streak DESC);

-- Leaderboard cache (global and per-group)
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  total_solved INTEGER NOT NULL DEFAULT 0,
  easy_solved INTEGER NOT NULL DEFAULT 0,
  medium_solved INTEGER NOT NULL DEFAULT 0,
  hard_solved INTEGER NOT NULL DEFAULT 0,
  weekly_solved INTEGER NOT NULL DEFAULT 0,
  weekly_easy INTEGER NOT NULL DEFAULT 0,
  weekly_medium INTEGER NOT NULL DEFAULT 0,
  weekly_hard INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaderboards_global ON leaderboards(group_id, hard_solved DESC, medium_solved DESC, easy_solved DESC);
CREATE INDEX idx_leaderboards_weekly ON leaderboards(group_id, weekly_hard DESC, weekly_medium DESC, weekly_easy DESC);

CREATE UNIQUE INDEX idx_leaderboards_user_global ON leaderboards(user_id) WHERE group_id IS NULL;
CREATE UNIQUE INDEX idx_leaderboards_user_group ON leaderboards(user_id, group_id) WHERE group_id IS NOT NULL;

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
