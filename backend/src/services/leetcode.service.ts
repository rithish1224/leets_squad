import { config } from '../config';
import { normalizeLeetCodeUsername } from '../utils/leetcode';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const LEETCODE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Referer: 'https://leetcode.com',
  Origin: 'https://leetcode.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function leetcodeGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(config.leetcode.graphqlUrl, {
    method: 'POST',
    headers: LEETCODE_HEADERS,
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error('LeetCode API blocked the request. Please try again in a moment.');
  }

  if (!response.ok) {
    throw new Error(`LeetCode API error: ${response.status} ${response.statusText}`);
  }

  let json: GraphQLResponse<T>;
  try {
    json = JSON.parse(text) as GraphQLResponse<T>;
  } catch {
    throw new Error('Invalid response from LeetCode API');
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(', '));
  }

  if (!json.data) {
    throw new Error('No data returned from LeetCode API');
  }

  return json.data;
}

export interface LeetCodeProfile {
  username: string;
  ranking: number | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
}

export interface LeetCodeSubmissionItem {
  id: string;
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

export interface LeetCodeRecentSubmission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

export interface LeetCodeContestData {
  attendedContestsCount: number;
  rating: number;
  globalRanking: number;
  topPercentage: number;
}

const USER_PROFILE_QUERY = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

const RECENT_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

const USER_CONTEST_QUERY = `
  query userContestRankingInfo($username: String!) {
    userContestRankingInfo(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      topPercentage
    }
  }
`;

const PROBLEM_DIFFICULTY_QUERY = `
  query questionTitle($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      difficulty
    }
  }
`;

const difficultyCache = new Map<string, 'Easy' | 'Medium' | 'Hard'>();

function resolveUsername(rawUsername: string): string {
  const normalized = normalizeLeetCodeUsername(rawUsername);
  if (!normalized) {
    throw new Error('LeetCode username is required');
  }
  return normalized;
}

export async function fetchProfile(rawUsername: string): Promise<LeetCodeProfile> {
  const username = resolveUsername(rawUsername);

  const data = await leetcodeGraphQL<{
    matchedUser: {
      username: string;
      profile: { ranking: number | null } | null;
      submitStatsGlobal: {
        acSubmissionNum: Array<{ difficulty: string; count: number }>;
      };
    } | null;
  }>(USER_PROFILE_QUERY, { username });

  if (!data.matchedUser) {
    const submissions = await fetchRecentAcceptedSubmissions(username, 1).catch(() => []);
    if (submissions.length === 0) {
      throw new Error(
        `LeetCode user "${username}" not found. Check your username in Settings — use only your handle (e.g. "john_doe"), not your email or profile URL.`
      );
    }

    return {
      username,
      ranking: null,
      totalSolved: submissions.length,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
    };
  }

  const stats = data.matchedUser.submitStatsGlobal.acSubmissionNum;
  const getCount = (diff: string) =>
    stats.find((s) => s.difficulty.toLowerCase() === diff.toLowerCase())?.count ?? 0;

  return {
    username: data.matchedUser.username,
    ranking: data.matchedUser.profile?.ranking ?? null,
    totalSolved: getCount('All'),
    easySolved: getCount('Easy'),
    mediumSolved: getCount('Medium'),
    hardSolved: getCount('Hard'),
  };
}

export async function fetchSolvedCount(username: string): Promise<number> {
  const profile = await fetchProfile(username);
  return profile.totalSolved;
}

export async function fetchRecentAcceptedSubmissions(
  rawUsername: string,
  limit = 50
): Promise<LeetCodeRecentSubmission[]> {
  const username = resolveUsername(rawUsername);

  const data = await leetcodeGraphQL<{
    recentAcSubmissionList: LeetCodeSubmissionItem[] | null;
  }>(RECENT_SUBMISSIONS_QUERY, { username, limit });

  const list = data.recentAcSubmissionList ?? [];

  return list.map((s) => ({
    title: s.title,
    titleSlug: s.titleSlug,
    timestamp: s.timestamp,
    statusDisplay: s.statusDisplay,
    lang: s.lang,
  }));
}

export async function fetchAllRecentSubmissions(
  rawUsername: string,
  maxSubmissions = 200
): Promise<LeetCodeRecentSubmission[]> {
  return fetchRecentAcceptedSubmissions(
    rawUsername,
    Math.min(maxSubmissions, 100)
  );
}

export async function fetchContestData(
  username: string
): Promise<LeetCodeContestData | null> {
  try {
    const data = await leetcodeGraphQL<{
      userContestRankingInfo: LeetCodeContestData | null;
    }>(USER_CONTEST_QUERY, { username: resolveUsername(username) });

    return data.userContestRankingInfo;
  } catch {
    return null;
  }
}

export async function fetchProblemDifficulty(
  titleSlug: string
): Promise<'Easy' | 'Medium' | 'Hard'> {
  if (difficultyCache.has(titleSlug)) {
    return difficultyCache.get(titleSlug)!;
  }

  try {
    const data = await leetcodeGraphQL<{
      question: { difficulty: string } | null;
    }>(PROBLEM_DIFFICULTY_QUERY, { titleSlug });

    const difficulty = (data.question?.difficulty ?? 'Medium') as
      | 'Easy'
      | 'Medium'
      | 'Hard';
    difficultyCache.set(titleSlug, difficulty);
    return difficulty;
  } catch {
    return 'Medium';
  }
}

export async function enrichSubmissionsWithDifficulty(
  submissions: LeetCodeRecentSubmission[]
): Promise<
  Array<LeetCodeRecentSubmission & { difficulty: 'Easy' | 'Medium' | 'Hard' }>
> {
  const uniqueSlugs = [...new Set(submissions.map((s) => s.titleSlug))];
  await Promise.all(uniqueSlugs.map((slug) => fetchProblemDifficulty(slug)));

  return submissions.map((s) => ({
    ...s,
    difficulty: difficultyCache.get(s.titleSlug) ?? 'Medium',
  }));
}

export { normalizeLeetCodeUsername };
