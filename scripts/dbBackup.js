require('dotenv').config();
const { exec } = require('child_process');
const { logger } = require('../logging');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const DATE = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_PATH = path.join(BACKUP_DIR, DATE);

// Créer le dossier de backup si inexistant
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const command = `mongodump --uri="${process.env.MONGO_URI}" --out="${BACKUP_PATH}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    logger.error('Échec de la sauvegarde DB', { error: error.message });
    process.exit(1);
  }
  
  logger.info(`Sauvegarde réussie dans ${BACKUP_PATH}`);
  
  // Suppression des vieux backups (7 jours)
  exec(`find ${BACKUP_DIR} -mtime +7 -delete`, (err) => {
    if (err) logger.error('Nettoyage des vieux backups échoué', { error: err.message });
  });
});