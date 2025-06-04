const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { logger, morganMiddleware } = require("./logging");

dotenv.config();
const app = express();

// 🔌 Connexion à la base de données
const connectDB = require("./config/db");
connectDB();

// Initialisation des logs
logger.info("🚀 Démarrage de l'application");
logger.info(`Mode: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Node: ${process.version}`);

// 📦 Middleware de parsing
app.use(express.json({ 
  type: 'application/json',
  limit: '10kb'
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10kb'
}));

// 🔐 Middlewares de sécurité
const security = require("./middlewares/security");

// 1. Logging
app.use(security.morgan);

// 2. Headers de sécurité
app.use(security.secureHeaders);

// 3. CORS
app.use(security.corsOptions);

// 4. Protection contre la pollution des paramètres
app.use(security.preventHPP);

// 5. Rate limiting
app.use("/api/", security.limiter);

// 6. Protection XSS (nouvelle version)
app.use(security.xssProtection);

// 🛣️ Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/property", require("./routes/propertyRoutes"));
app.use("/api/favoris", require("./routes/favorisRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

// 🧪 Route de santé
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  logger.http("Accès à la route racine");
  res.send("🚀 API backend opérationnelle");
});

// ❌ Middleware 404
app.use((req, res) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 404,
    error: "Ressource non trouvée"
  });
});

// 🔥 Middleware global d'erreur
app.use((err, req, res, next) => {
  logger.error(`Erreur serveur: ${err.stack || err.message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const errorResponse = {
    status: err.status || 500,
    error: "Erreur interne du serveur"
  };

  if (process.env.NODE_ENV !== 'production') {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// Gestion des erreurs non catchées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;