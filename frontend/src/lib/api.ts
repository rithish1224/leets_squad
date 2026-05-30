import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  leetcode_username: string | null;
  timezone: string;
  daily_goal: number;
  weekly_goal: number;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface DashboardData {
  daily: {
    goal_date: string;
    goal_target: number;
    solved_count: number;
    status: string;
  };
  weekly: {
    week_start: string;
    goal_target: number;
    solved_count: number;
    status: string;
    remaining: number;
    percentage: number;
  };
  streak: {
    current_streak: number;
    longest_streak: number;
    last_success_date: string | null;
  } | null;
  snapshot: {
    total_solved: number;
    easy_solved: number;
    medium_solved: number;
    hard_solved: number;
    synced_at: string;
  } | null;
  lastSync: {
    status: string;
    message: string;
    synced_at: string;
  } | null;
  recentSubmissions: Array<{
    problem_title: string;
    problem_slug: string;
    difficulty: string;
    submitted_at: string;
  }>;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  group_code: string;
  owner_id: string;
  member_count?: number;
}

export interface GroupDashboard {
  group: Group;
  goals: { daily_goal: number; weekly_goal: number } | null;
  members: Array<{
    userId: string;
    username: string;
    leetcodeUsername: string | null;
    timezone: string;
    localDate: string;
    dailyProgress: { goal_target: number; solved_count: number; status: string };
    weeklyProgress: { goal_target: number; solved_count: number; status: string };
    currentStreak: number;
  }>;
  memberCount: number;
  dailyCompletionRate: number;
  accountability: {
    succeededToday: string[];
    failedToday: string[];
    weeklySucceeded: string[];
    weeklyFailed: string[];
  };
}

export interface GroupSettingsResponse {
  group: Group;
  goals: { daily_goal: number; weekly_goal: number } | null;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  weekly_solved: number;
  weekly_easy: number;
  weekly_medium: number;
  weekly_hard: number;
  current_streak: number;
}

export interface AnalyticsData {
  solvedOverTime: Array<{ date: string; count: string }>;
  difficultyDistribution: Array<{ difficulty: string; count: string }>;
  dailyHistory: Array<{ goal_date: string; goal_target: number; solved_count: number; status: string }>;
  weeklyHistory: Array<{ week_start: string; goal_target: number; solved_count: number; status: string }>;
  streakHistory: Array<{ date: string; solved: number; status: string; streak: number }>;
  heatmap: Array<{ date: string; count: number }>;
}

export interface GroupActivity {
  id: string;
  username: string;
  activity_type: string;
  problem_title: string | null;
  difficulty: string | null;
  message: string | null;
  created_at: string;
}

export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    leetcode_username?: string;
    timezone?: string;
  }) => api.post<ApiResponse<AuthResponse>>('/auth/register', data),
  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<ApiResponse<User>>('/auth/me'),
  sendResetOtp: (email: string) =>
    api.post<ApiResponse<{ success: boolean; message: string; resetToken?: string }>>('/auth/send-reset-otp', { email }),
  verifyResetToken: (resetToken: string) =>
    api.get<ApiResponse<{ email: string; userId: string }>>(`/auth/verify-reset-token/${resetToken}`),
  verifyOtpAndReset: (email: string, otp: string, newPassword: string) =>
    api.post<ApiResponse<{ success: boolean; message: string }>>('/auth/verify-otp-and-reset', {
      email,
      otp,
      newPassword,
    }),
};

export const userApi = {
  dashboard: () => api.get<ApiResponse<DashboardData>>('/users/dashboard'),
  sync: () => api.post('/users/sync'),
  updateSettings: (data: Partial<User>) => api.put<ApiResponse<User>>('/users/settings', data),
  deleteAccount: () => api.delete<ApiResponse<{ message: string }>>('/users/me'),
};

export const groupApi = {
  list: () => api.get<ApiResponse<Group[]>>('/groups'),
  create: (data: { name: string; description?: string; daily_goal?: number; weekly_goal?: number }) =>
    api.post<ApiResponse<Group>>('/groups', data),
  join: (group_code: string) => api.post<ApiResponse<Group>>('/groups/join', { group_code }),
  dashboard: (id: string) => api.get<ApiResponse<GroupDashboard>>(`/groups/${id}/dashboard`),
  leaderboard: (id: string, weekly?: boolean) =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/groups/${id}/leaderboard`, { params: { weekly } }),
  updateSettings: (id: string, data: { name?: string; description?: string; daily_goal?: number; weekly_goal?: number }) =>
    api.put<ApiResponse<GroupSettingsResponse>>(`/groups/${id}/settings`, data),
  updateGoals: (id: string, data: { daily_goal?: number; weekly_goal?: number }) =>
    api.put(`/groups/${id}/goals`, data),
  leave: (id: string) => api.delete(`/groups/${id}/leave`),
  delete: (id: string) => api.delete(`/groups/${id}`),
  activity: (id: string, limit?: number) =>
    api.get<ApiResponse<GroupActivity[]>>(`/groups/${id}/activity`, { params: { limit } }),
};

export const leaderboardApi = {
  global: (weekly?: boolean) =>
    api.get<ApiResponse<LeaderboardEntry[]>>('/leaderboard', { params: { weekly } }),
};

export const analyticsApi = {
  get: (days?: number) =>
    api.get<ApiResponse<AnalyticsData>>('/analytics', { params: { days } }),
};
