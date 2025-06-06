module.exports = {
  apps: [
    {
      name: 'api',
      script: 'server.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'backup-cron',
      script: 'scripts/backupCron.js',
      autorestart: false,
      cron_restart: '0 2 * * *'
    },
    {
      name: 'backup-monitor',
      script: 'scripts/backupMonitor.js',
      autorestart: false,
      cron_restart: '0 3 * * *'
    }
  ]
};