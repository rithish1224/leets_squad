-- Group activity feed (problem solved, goal updates)
CREATE TABLE group_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('PROBLEM_SOLVED', 'GOAL_COMPLETED', 'SYNC')),
  problem_title VARCHAR(255),
  problem_slug VARCHAR(255),
  difficulty VARCHAR(20),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_activity_group_id ON group_activity(group_id, created_at DESC);
CREATE INDEX idx_group_activity_user_id ON group_activity(user_id, created_at DESC);
