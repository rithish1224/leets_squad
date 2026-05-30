const query = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum { difficulty count }
      }
    }
  }
`;

async function test(username: string) {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Referer: 'https://leetcode.com',
      Origin: 'https://leetcode.com',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({ query, variables: { username } }),
  });
  const text = await res.text();
  console.log('status', res.status);
  console.log(text.slice(0, 500));
}

test(process.argv[2] || 'leetcode');
