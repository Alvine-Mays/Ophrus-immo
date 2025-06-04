const app = require('./app');
const PORT = process.env.PORT || 5000;

require('./config/db')()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  });

// Garder le processus actif
setInterval(() => {}, 1000);