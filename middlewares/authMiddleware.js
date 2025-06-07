const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { logger } = require('../utils/logging');

// Middleware de protection par JWT
const protect = async (req, res, next) => {
  let token;

  try {
    // 1. Extraction du token
    token = extractTokenFromRequest(req);
    if (!token) {
      return sendUnauthorizedResponse(res, 'Token manquant');
    }

    // 2. Vérification du token
    const decoded = verifyJwtToken(token);
    
    // 3. Récupération de l'utilisateur
    req.user = await User.findById(decoded.id)
      .select('-password -refreshTokens -resetCode');
    
    if (!req.user) {
      return sendUnauthorizedResponse(res, 'Utilisateur non trouvé');
    }

    next();
  } catch (error) {
    handleAuthError(error, res);
  }
};

// Middleware adminOnly
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    logger.warn(`Tentative d'accès admin non autorisé par ${req.user?.email || 'unknown'}`);
    return res.status(403).json({ 
      success: false,
      message: "Accès réservé aux administrateurs" 
    });
  }
  next();
};

// --- Fonctions utilitaires ---

function extractTokenFromRequest(req) {
  if (req.headers.authorization?.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

function verifyJwtToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function sendUnauthorizedResponse(res, message) {
  logger.warn(`Accès non autorisé: ${message}`);
  return res.status(401).json({ 
    success: false,
    message 
  });
}

function handleAuthError(error, res) {
  logger.error("Erreur d'authentification", {
    error: error.message,
    stack: error.stack
  });

  const message = error.name === 'JsonWebTokenError' 
    ? 'Token invalide' 
    : 'Erreur d\'authentification';

  return res.status(401).json({ 
    success: false,
    message 
  });
}

module.exports = { 
  protect,
  adminOnly
};