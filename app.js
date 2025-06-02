const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();
const app = express();

// 🔌 Connexion à la base de données
const connectDB = require("./config/db");
connectDB();

// 📦 Middleware de parsing JSON/URL-encoded
app.use(express.json({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));

// 🔐 Middlewares de sécurité
const {
  secureHeaders,
  limiter,
  preventHPP,
  corsOptions,
  sanitize,
  xssSanitizeAll,
} = require("./middlewares/security");

app.use(corsOptions);
app.use(sanitize);
app.use(xssSanitizeAll);
app.use(secureHeaders);
app.use(preventHPP);
app.use(limiter);

// 📜 Logging HTTP dans un fichier en production
if (process.env.NODE_ENV === "production") {
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, "logs/server.log"), { flags: "a" }
  );
  app.use(morgan("combined", { stream: accessLogStream }));
} else {
  app.use(morgan("dev"));
}

// 🛣️ Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/property", require("./routes/propertyRoutes"));
app.use("/api/favoris", require("./routes/favorisRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

// 🧪 Route de test
app.get("/", (req, res) => {
  res.send("🚀 API backend opérationnelle");
});

// ❌ Middleware 404 : route non trouvée
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: "Ressource non trouvée"
  });
});

// 🔥 Middleware global d’erreur serveur
app.use((err, req, res, next) => {
  console.error("🔥 Erreur serveur :", err.stack);
  res.status(err.status || 500).json({
    status: err.status || 500,
    error: err.message || "Erreur interne du serveur"
  });
});

module.exports = app;
