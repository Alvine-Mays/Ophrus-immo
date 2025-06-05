const User = require('../models/User');
const { logger } = require('../logging');
const mongoose = require('mongoose');

module.exports = {
  async cleanExpiredResetCodes() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Nettoyage par lots pour les grosses bases de données
      const batchSize = 500;
      let totalCleaned = 0;
      let shouldContinue = true;

      while (shouldContinue) {
        const result = await User.updateMany(
          { 
            resetCodeExpires: { 
              $lt: new Date(),
              $ne: null 
            } 
          },
          { 
            $set: { 
              resetCode: null,
              resetCodeExpires: null 
            } 
          },
          { 
            limit: batchSize,
            session 
          }
        );

        totalCleaned += result.modifiedCount;
        shouldContinue = result.modifiedCount === batchSize;

        if (shouldContinue) {
          await session.commitTransaction();
          session.startTransaction();
        }
      }

      await session.commitTransaction();
      logger.info(`🧹 ${totalCleaned} codes expirés nettoyés`, { 
        operation: 'cleanExpiredResetCodes',
        status: 'success' 
      });
      
      return { totalCleaned };
    } catch (error) {
      await session.abortTransaction();
      logger.error('❌ Échec du nettoyage des codes', {
        error: error.message,
        stack: error.stack,
        operation: 'cleanExpiredResetCodes',
        status: 'failed'
      });
      throw error;
    } finally {
      session.endSession();
    }
  }
};