require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 5000;
const { initEmailTransporter } = require('./utils/sendEmail');

require('./config/db')()
  .then(async () => {
    // Initialise le transporteur email avant de démarrer le serveur
    await initEmailTransporter();

    // Configuration du nettoyage en production
    if (process.env.NODE_ENV === 'production') {
      const cron = require('node-cron');
      const { cleanExpiredResetCodes } = require('./utils/dbCleaner');
      
      // Toutes les 10 minutes
      cron.schedule('*/10 * * * *', async () => {
        try {
          console.log('🧹 Nettoyage des codes de réinitialisation expirés...');
          await cleanExpiredResetCodes();
        } catch (err) {
          console.error('❌ Erreur lors du nettoyage:', err.message);
        }
      });

      console.log('🔄 Nettoyage automatique activé (toutes les 10 minutes)');
    }

    // Lancer le serveur après TOUTES les initialisations
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`⚡ Mode: ${process.env.NODE_ENV || 'development'}`);
    });

  })
  .catch(err => {
    console.error('❌ Échec au démarrage du serveur :', err.message);
    process.exit(1);
  });
