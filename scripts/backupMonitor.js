// scripts/backupMonitor.js
const cron    = require('node-cron');
const { exec }= require('child_process');
const { logger } = require('../utils/logging');

cron.schedule('*/30 * * * *', () => {
  exec('ls backups | wc -l', (err, stdout) => {
    if (err) return logger.error('Monitor backup err', { error: err.message });
    const count = parseInt(stdout.trim(), 10);
    logger.info(`Nombre de backups existants: ${count}`);
  });
});

logger.info('Monitor de backups démarré (toutes les 30m)');
