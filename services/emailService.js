const sendAlert = async ({ type, message, severity }) => {
  try {
    const admins = await User.find({ role: 'admin', emailVerified: true })
      .select('email');

    if (!admins.length) return;

    await sendEmail({
      to: admins.map(u => u.email),
      subject: `[${severity.toUpperCase()}] Alerte ${type}`,
      template: 'backupAlert',
      context: {
        alertType: type,
        alertMessage: message,
        severity,
        date: new Date().toLocaleString()
      }
    });
  } catch (error) {
    logger.error('Échec envoi alerte', { error: error.message });
  }
};

module.exports = { sendEmail, sendAlert };