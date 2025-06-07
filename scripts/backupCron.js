// scripts/backupCron.js
const fs = require('fs');
const path = require('path');

console.log(`[${new Date().toISOString()}] → Lancement de la sauvegarde...`);

const source = path.join(__dirname,'.env'); // Dossier à sauvegarder
const backupDir = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const backupFile = path.join(backupDir, `backup-${Date.now()}.tar`);

const { exec } = require('child_process');
exec(`tar -cf ${backupFile} ${source}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Erreur de sauvegarde : ${error.message}`);
    return;
  }
  console.log(`Sauvegarde terminée avec succès : ${backupFile}`);
});
