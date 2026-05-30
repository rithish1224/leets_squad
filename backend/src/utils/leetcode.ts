export function normalizeLeetCodeUsername(input: string): string {
  let username = input.trim();

  if (!username) return '';

  const urlMatch = username.match(
    /leetcode\.com\/u\/([^/?#]+)/i
  );
  if (urlMatch) {
    username = urlMatch[1];
  } else {
    const profileMatch = username.match(/leetcode\.com\/([^/?#]+)/i);
    if (profileMatch && profileMatch[1] !== 'u') {
      username = profileMatch[1];
    }
  }

  username = username.replace(/^@/, '');
  username = decodeURIComponent(username);
  return username.trim();
}

export function isValidLeetCodeUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{1,30}$/.test(username);
}
