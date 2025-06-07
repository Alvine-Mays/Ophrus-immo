// scripts/notify.js
require('dotenv').config();
const { backupService } = require('../services/backupService');
const { emailService  } = require('../services/emailService');

(async () => {
  const status = await backupService.checkLastBackup();
  if (!status.ok) {
    await emailService.send({
      to:      process.env.ADMIN_EMAIL,
      subject: '⚠️ Backup échoué',
      template:'backupAlert',
      context: { reason: status.error }
    });
  }
})();
