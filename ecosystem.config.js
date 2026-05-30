module.exports = {
  apps: [
    {
      name: "leetsquad-backend",
      script: "./dist/index.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
      },
      instances: "max",           // Scale across all CPU cores
      exec_mode: "cluster",       // Run in cluster mode
      autorestart: true,          // Restart if it crashes
      watch: false,               // Do not watch files in prod
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm Z"
    }
  ]
};