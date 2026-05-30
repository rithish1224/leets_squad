import app from './app';
import { config, validateProductionConfig } from './config';
import { startCronJobs } from './jobs/sync.cron';

try {
  validateProductionConfig();
} catch (err) {
  console.error('Configuration validation failed:', err);
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`LeetSquad API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Database: ${config.databaseUrl.split('@')[1] || 'local'}`);
  startCronJobs();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, gracefully shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, gracefully shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
