const { sendAlert } = require('../services/emailService');
const { logger } = require('./logging');

module.exports = {
  sendBackupNotification: async (success, details = {}) => {
    const alertType = success ? 'backup_success' : 'backup_failed';
    
    await sendAlert({
      type: alertType,
      message: success 
        ? `Backup réussi: ${details.path}` 
        : `Échec du backup: ${details.error}`,
      severity: success ? 'low' : 'critical',
      additionalData: details
    });

    logger.log(success ? 'info' : 'error', 
      `Notification ${alertType} envoyée`, 
      details
    );
  },

  sendSystemAlert: async (message, severity = 'medium') => {
    await sendAlert({
      type: 'system_alert',
      message,
      severity
    });
  }
};