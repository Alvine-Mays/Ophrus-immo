// scripts/dbBackup.js
require('dotenv').config();
const { exec }  = require('child_process');
const { logger }= require('../utils/logging');
const fs        = require('fs');
const path      = require('path');

const BACKUP_DIR = path.resolve(__dirname, '../backups');
const DATE       = new Date().toISOString().replace(/[:.]/g,'-');
const OUT_DIR    = path.join(BACKUP_DIR, DATE);

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive:true });

exec(`mongodump --uri="${process.env.MONGO_URI}" --out="${OUT_DIR}"`, (err, stdout, stderr) => {
  if (err) {
    logger.error('Backup échoué', { error: err.message });
    process.exit(1);
  }
  logger.info(`Backup réalisé: ${OUT_DIR}`);

  // purge >7j
  exec(`find ${BACKUP_DIR} -type d -mtime +7 -exec rm -rf {} +`, (e) => {
    if (e) logger.error('Suppression anciens backups échouée', { error: e.message });
    else logger.info('Anciens backups purgés (>7j)');
  });
});
