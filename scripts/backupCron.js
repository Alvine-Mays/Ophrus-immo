const cron = require('node-cron');
const { exec } = require('child_process');
const { logger } = require('../utils/logging');
const { sendAlert } = require('../services/emailService');

// Backup quotidien à 2h du matin
cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Début du backup DB');
    const { stdout, stderr } = await exec('node scripts/dbBackup.js');
    
    if (stderr) {
      throw new Error(stderr);
    }
    
    logger.info('Backup DB terminé avec succès');
  } catch (error) {
    logger.error('Échec du backup DB', { error: error.message });
    await sendAlert({
      type: 'backup',
      message: `Échec du backup DB: ${error.message}`,
      severity: 'critical'
    });
  }
});

// Vérification hebdomadaire des backups
cron.schedule('0 3 * * 1', () => {
  require('./backupMonitor')();
});

logger.info('Système de backup et monitoring démarré');