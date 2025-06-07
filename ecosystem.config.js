module.exports = {
  apps: [
    {
      name: 'api',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000
      }
    },
    {
      name: 'backup-cron',
      script: 'scripts/dbBackup.js', // 🔁 Ton script est dbBackup.js, pas backupCron.js
      autorestart: false,
      cron_restart: '0 2 * * *' // Tous les jours à 2h
    },
    {
      name: 'backup-monitor',
      script: 'scripts/backupMonitor.js',
      autorestart: false,
      cron_restart: '0 3 * * *' // Tous les jours à 3h
    }
  ]
};
