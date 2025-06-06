const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logging');
const { sendAlert } = require('./emailService');

const execPromise = util.promisify(exec);

module.exports = {
  performBackup: async () => {
    const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, date);

    try {
      // Création du dossier de backup
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Commande de sauvegarde
      const { stdout, stderr } = await execPromise(
        `mongodump --uri="${process.env.MONGO_URI}" --out="${backupPath}" --gzip`
      );

      // Nettoyage des anciens backups
      const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;
      await execPromise(
        `find ${backupDir} -name "*.gz" -mtime +${retentionDays} -delete`
      );

      logger.info(`Backup réussi: ${backupPath}`);
      return { success: true, path: backupPath };
    } catch (error) {
      logger.error('Échec du backup', { 
        error: error.message,
        stack: error.stack 
      });
      
      await sendAlert({
        type: 'backup',
        message: `Échec critique du backup: ${error.message}`,
        severity: 'critical'
      });

      return { success: false, error: error.message };
    }
  },

  verifyBackup: async (backupPath) => {
    try {
      const { stdout } = await execPromise(
        `mongorestore --uri="${process.env.MONGO_URI_TEST}" --objcheck --dryRun "${backupPath}"`
      );
      return { valid: true };
    } catch (error) {
      return { 
        valid: false,
        error: error.message 
      };
    }
  }
};