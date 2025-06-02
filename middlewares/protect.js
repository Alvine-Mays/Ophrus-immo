// backend/middlewares/protect.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Vérifie que l'en-tête contient le token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Récupère le token
      token = req.headers.authorization.split(' ')[1];

      // Vérifie et décode le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Récupère l'utilisateur sans le mot de passe
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Laisse passer
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Token invalide, accès refusé' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Pas de token, accès refusé' });
  }
};

module.exports = protect;
