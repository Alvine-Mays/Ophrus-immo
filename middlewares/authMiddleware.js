const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // Vérifie si le token est dans l'en-tête Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]; // Récupère le token de l'en-tête

      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Vérifie le token avec la clé secrète

      // Attache l'utilisateur à la requête
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      next(); // Passe à l'étape suivante
    } catch (error) {
      console.error("Erreur de vérification du token:", error);
      return res.status(401).json({ message: 'Token invalide' });
    }
  } else {
    res.status(401).json({ message: 'Non autorisé, token requis' });
  }
};

module.exports = { protect };
