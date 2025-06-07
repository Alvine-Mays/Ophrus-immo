// services/backupService.js
const fs   = require('fs');
const path = require('path');

exports.backupService = {
  checkLastBackup: async () => {
    try {
      const bkDir = path.resolve('backups');
      const entries = fs.readdirSync(bkDir).sort();
      const last   = entries.pop();
      const stats  = fs.statSync(path.join(bkDir, last));
      const ageMin = (Date.now() - stats.ctimeMs) / 60000;
      if (ageMin > 60) {
        return { ok:false, error:`Dernier backup il y a ${Math.floor(ageMin)} minutes` };
      }
      return { ok:true };
    } catch (err) {
      return { ok:false, error: err.message };
    }
  }
};
