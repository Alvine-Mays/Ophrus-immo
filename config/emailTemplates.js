module.exports = {
  templates: {
    backupAlert: {
      subject: (context) => `[${context.severity.toUpperCase()}] Alerte Backup - ${context.serverName}`,
      template: 'backupAlert',
      priority: 'high'
    },
    passwordReset: {
      subject: 'Réinitialisation de votre mot de passe',
      template: 'passwordReset'
    }
  },

  getTemplateConfig: (templateName) => {
    return this.templates[templateName] || {
      subject: 'Notification Ophrus Immo',
      template: templateName
    };
  }
};