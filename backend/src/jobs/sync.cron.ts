import cron from 'node-cron';
import { syncAllUsers } from '../services/sync.service';
import { refreshAllLeaderboards } from '../services/leaderboard.service';

export function startCronJobs() {
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Starting hourly LeetCode sync for all users...');
    try {
      const result = await syncAllUsers();
      console.log(`[CRON] Sync complete: ${result.synced} synced, ${result.failed} failed`);
    } catch (error) {
      console.error('[CRON] Sync job failed:', error);
    }
  });

  cron.schedule('5 * * * *', async () => {
    console.log('[CRON] Refreshing leaderboards...');
    try {
      await refreshAllLeaderboards();
      console.log('[CRON] Leaderboards refreshed');
    } catch (error) {
      console.error('[CRON] Leaderboard refresh failed:', error);
    }
  });

  console.log('Cron jobs scheduled: hourly sync at :00, leaderboard refresh at :05');
}
