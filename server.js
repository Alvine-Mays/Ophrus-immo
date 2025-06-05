const app = require('./app');
const PORT = process.env.PORT || 5000;
require('./config/db')()
  .then(() => {
    // Configuration du nettoyage en production
    if (process.env.NODE_ENV === 'production') {
      const cron = require('node-cron');
      const { cleanExpiredResetCodes } = require('./utils/dbCleaner');
      
      // Toutes les 10 minutes (à la minute 0, 10, 20, etc.)
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

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`⚡ Mode: ${process.env.NODE_ENV || 'development'}`);
    });

    // Garder le processus actif (seulement si nécessaire pour des tâches en background)
    // setInterval(() => {}, 1000); // À décommenter seulement si nécessaire
  })
  .catch(err => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  });