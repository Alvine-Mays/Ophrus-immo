const { exec } = require('child_process');
const { sendAlert } = require('../services/emailService');
const { logger } = require('../utils/logging');

const checkBackup = async () => {
  try {
    // Vérifie le dernier backup
    const { stdout } = await exec('ls -t backups | head -n 1');
    const lastBackup = stdout.trim();
    
    if (!lastBackup) {
      throw new Error('Aucun backup trouvé');
    }

    const backupTime = new Date(lastBackup);
    const now = new Date();
    const diffHours = (now - backupTime) / (1000 * 60 * 60);

    if (diffHours > 24) {
      await sendAlert({
        type: 'backup',
        message: `Dernier backup il y a ${diffHours.toFixed(1)} heures`,
        severity: 'critical'
      });
    }

    logger.info('Vérification backup OK', { lastBackup });
  } catch (error) {
    await sendAlert({
      type: 'backup',
      message: `Échec vérification backup: ${error.message}`,
      severity: 'critical'
    });
    logger.error('Échec monitoring backup', { error: error.message });
  }
};

// Exécution quotidienne
checkBackup();