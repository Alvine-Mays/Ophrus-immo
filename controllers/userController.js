const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const { logger } = require("../logging");

// Génère un token de rafraîchissement
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

/* ------------------------------------------------------------------ */
/* GET /api/users/profil – Retourne l'utilisateur actuel              */
/* ------------------------------------------------------------------ */
exports.getUser = async (req, res) => {
  try {
    if (!req.user) {
      logger.warn("Tentative d'accès non autorisé au profil");
      return res.status(401).json({ message: "Non autorisé." });
    }

    logger.debug(`Récupération du profil utilisateur ID: ${req.user.id}`);
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      logger.error(`Utilisateur non trouvé ID: ${req.user.id}`);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    logger.info(`Profil récupéré avec succès ID: ${user._id}`);
    res.json(user);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du profil: ${error.message}`, {
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/register – Inscription                             */
/* ------------------------------------------------------------------ */
exports.registerUser = async (req, res) => {
  try {
    const { nom, email, telephone, password } = req.body;
    logger.debug(`Tentative d'inscription: ${email}`);

    const existing = await User.findOne({ email });
    if (existing) {
      logger.warn(`Email déjà utilisé: ${email}`);
      return res.status(400).json({ message: "Utilisateur déjà inscrit." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      nom, 
      email, 
      telephone, 
      password: hashed,
      refreshTokens: [] // Initialisation explicite
    });

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save();
    
  } catch (error) {
    logger.error(`Erreur lors de l'inscription: ${error.message}`, {
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/login – Connexion                                 */
/* ------------------------------------------------------------------ */
exports.loginUser = async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.nom;
    const { password } = req.body;
    logger.debug(`Tentative de connexion: ${identifier}`);

    const user = await User.findOne({
      $or: [{ email: identifier }, { nom: identifier }],
    }).select('+password +refreshTokens'); // Ajout de +refreshTokens

    if (!user) {
      logger.warn(`Identifiant non trouvé: ${identifier}`);
      return res.status(401).json({ message: "Utilisateur non trouvé." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Mot de passe incorrect pour l'utilisateur: ${user.email}`);
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Initialisation du tableau si undefined
    if (!user.refreshTokens) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(refreshToken);
    
    await user.save();

    logger.info(`Connexion réussie ID: ${user._id}`, {
      email: user.email,
      ip: req.ip
    });

    res.json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      token,
      refreshToken,
    });
  } catch (error) {
    logger.error(`Erreur lors de la connexion: ${error.message}`, {
      stack: error.stack,
      identifier: req.body.identifier
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/logout – Déconnexion                               */
/* ------------------------------------------------------------------ */
exports.logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    logger.debug("Tentative de déconnexion");

    if (!refreshToken) {
      logger.warn("Refresh token manquant pour la déconnexion");
      return res.status(400).json({ message: "Refresh token requis" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      logger.error(`Utilisateur non trouvé lors de la déconnexion ID: ${decoded.id}`);
      return res.status(401).json({ message: "Utilisateur non trouvé." });
    }

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    await user.save();

    logger.info(`Déconnexion réussie ID: ${user._id}`);
    res.status(200).json({ message: "Déconnexion réussie." });
  } catch (error) {
    logger.error(`Erreur lors de la déconnexion: ${error.message}`, {
      stack: error.stack
    });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/refresh-token – Renouvelle les tokens              */
/* ------------------------------------------------------------------ */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    logger.debug("Tentative de renouvellement de token");

    if (!refreshToken) {
      logger.warn("Refresh token manquant");
      return res.status(401).json({ message: "Refresh token requis" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      logger.warn(`Refresh token invalide pour l'utilisateur ID: ${decoded.id}`);
      return res.status(403).json({ message: "Token invalide." });
    }

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    logger.info(`Tokens renouvelés avec succès ID: ${user._id}`);

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error(`Erreur lors du refresh token: ${error.message}`, {
      stack: error.stack
    });
    res.status(403).json({ message: "Token expiré ou invalide." });
  }
};

/* ------------------------------------------------------------------ */
/* PUT /api/users/:id – Mise à jour du profil                         */
/* ------------------------------------------------------------------ */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, telephone } = req.body;
    logger.debug(`Tentative de mise à jour du profil ID: ${id}`);

    const user = await User.findById(id);
    if (!user) {
      logger.error(`Utilisateur non trouvé pour mise à jour ID: ${id}`);
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (user._id.toString() !== req.user.id) {
      logger.warn(`Tentative de modification non autorisée ID: ${id} par l'utilisateur ID: ${req.user.id}`);
      return res.status(403).json({ message: "Accès interdit." });
    }

    const updates = {};
    if (nom) updates.nom = nom;
    if (email) updates.email = email;
    if (telephone) updates.telephone = telephone;

    Object.assign(user, updates);
    await user.save();

    logger.info(`Profil mis à jour avec succès ID: ${user._id}`, {
      updatedFields: Object.keys(updates)
    });

    res.json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du profil: ${error.message}`, {
      stack: error.stack,
      userId: req.params.id
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/reset-request – Envoie un code de réinitialisation */
/* ------------------------------------------------------------------ */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    logger.debug(`Demande de réinitialisation de mot de passe pour: ${email}`);

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn(`Email non trouvé pour réinitialisation: ${email}`);
      return res
        .status(404)
        .json({ message: "Aucun utilisateur trouvé avec cet e-mail." });
    }

    if (user.resetCodeExpires && user.resetCodeExpires > Date.now()) {
      const remaining = Math.ceil((user.resetCodeExpires - Date.now()) / 60000);
      logger.warn(`Tentative trop fréquente pour: ${email} - Temps restant: ${remaining} min`);
      return res.status(429).json({
        message: `Un code vous a déjà été envoyé. Réessayez dans ${remaining} minute(s).`,
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000;

    await user.save();
    await sendEmail({
      to: email,
      subject: "Code de réinitialisation de mot de passe",
      code,
    });

    logger.info(`Code de réinitialisation envoyé à: ${email}`, {
      userId: user._id
    });

    res.status(200).json({ message: "Code envoyé par email." });
  } catch (error) {
    logger.error(`Erreur lors de la demande de réinitialisation: ${error.message}`, {
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/reset-verify – Vérifie le code de réinitialisation */
/* ------------------------------------------------------------------ */
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    logger.debug(`Vérification du code de réinitialisation pour: ${email}`);

    const user = await User.findOne({ email });

    if (
      !user ||
      !user.resetCode ||
      !user.resetCodeExpires ||
      user.resetCodeExpires < Date.now()
    ) {
      logger.warn(`Code invalide/expiré pour: ${email}`);
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    if (user.resetCode !== String(code).trim()) {
      logger.warn(`Code incorrect pour: ${email}`);
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    logger.info(`Code vérifié avec succès pour: ${email}`);

    res.status(200).json({ message: "Code valide." });
  } catch (error) {
    logger.error(`Erreur lors de la vérification du code: ${error.message}`, {
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/reset-password – Change le mot de passe */
/* ------------------------------------------------------------------ */
exports.resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    logger.debug(`Demande de réinitialisation de mot de passe pour: ${email}`);

    // Modification ici - ajout de .select('+password')
    const user = await User.findOne({ email, resetCode: code }).select('+password');
    if (!user || user.resetCodeExpires < Date.now()) {
      logger.warn(`Code invalide/expiré pour la réinitialisation: ${email}`);
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    logger.info(`Mot de passe réinitialisé avec succès pour: ${email}`, {
      userId: user._id
    });

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    logger.error(`Erreur lors de la réinitialisation du mot de passe: ${error.message}`, {
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/users/search – Rechercher des utilisateurs                */
/* ------------------------------------------------------------------ */
exports.searchUsers = async (req, res) => {
  try {
    const { nom, email } = req.query;
    logger.debug(`Recherche d'utilisateurs - nom: ${nom}, email: ${email}`);

    const query = [];
    if (nom) query.push({ nom: { $regex: nom, $options: "i" } });
    if (email) query.push({ email: { $regex: email, $options: "i" } });

    const users = await User.find(query.length ? { $or: query } : {}).select(
      "_id nom email"
    );

    logger.info(`Recherche effectuée - résultats: ${users.length}`);

    res.json(users);
  } catch (error) {
    logger.error(`Erreur lors de la recherche d'utilisateurs: ${error.message}`, {
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* DELETE /api/users/:id – Supprime un utilisateur                    */
/* ------------------------------------------------------------------ */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id) {
      logger.warn(`Suppression non autorisée par l'utilisateur ID: ${req.user.id}`);
      return res.status(403).json({ message: "Action non autorisée" });
    }

    const user = await User.findById(id);
    if (!user) {
      logger.error(`Utilisateur à supprimer non trouvé ID: ${id}`);
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    await user.deleteOne();

    logger.info(`Utilisateur supprimé avec succès ID: ${id}`);
    res.status(200).json({ message: "Compte utilisateur supprimé avec succès." });

  } catch (error) {
    logger.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`, {
      stack: error.stack,
      userId: req.params.id
    });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* DELETE /api/users/:id – Supprime un utilisateur                    */
/* ------------------------------------------------------------------ */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifie que l'utilisateur connecté correspond à celui qu'on veut supprimer
    if (req.user.id !== id) {
      logger.warn(`Suppression non autorisée par l'utilisateur ID: ${req.user.id}`);
      return res.status(403).json({ message: "Action non autorisée" });
    }

    const user = await User.findById(id);
    if (!user) {
      logger.error(`Utilisateur à supprimer non trouvé ID: ${id}`);
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    await user.deleteOne();

    logger.info(`Utilisateur supprimé avec succès ID: ${id}`);
    res.status(200).json({ message: "Compte utilisateur supprimé avec succès." });

  } catch (error) {
    logger.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`, {
      stack: error.stack,
      userId: req.params.id
    });
    res.status(500).json({ message: "Erreur serveur." });
  }
};
