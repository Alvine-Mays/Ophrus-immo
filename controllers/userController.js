// controllers/userController.js
const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

// Génère un token de rafraîchissement
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

/* ------------------------------------------------------------------ */
/* GET /api/users/profil – Retourne l'utilisateur actuel              */
/* ------------------------------------------------------------------ */
exports.getUser = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Non autorisé." });

  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

/* ------------------------------------------------------------------ */
/* POST /api/users/register – Inscription                             */
/* ------------------------------------------------------------------ */
exports.registerUser = async (req, res) => {
  const { nom, email, telephone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing)
    return res.status(400).json({ message: "Utilisateur déjà inscrit." });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ nom, email, telephone, password: hashed });

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshTokens.push(refreshToken);
  await user.save();

  res.status(201).json({
    _id: user._id,
    nom: user.nom,
    email: user.email,
    token,
    refreshToken,
  });
};

/* ------------------------------------------------------------------ */
/* POST /api/users/login – Connexion                                 */
/* ------------------------------------------------------------------ */
exports.loginUser = async (req, res) => {
  const identifier = req.body.identifier || req.body.email || req.body.nom;
  const { password } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { nom: identifier }],
  });

  if (!user)
    return res.status(401).json({ message: "Utilisateur non trouvé." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: "Mot de passe incorrect." });

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshTokens.push(refreshToken);
  await user.save();

  res.json({
    _id: user._id,
    nom: user.nom,
    email: user.email,
    token,
    refreshToken,
  });
};

/* ------------------------------------------------------------------ */
/* POST /api/users/logout – Déconnexion                               */
/* ------------------------------------------------------------------ */
exports.logoutUser = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token requis" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ message: "Utilisateur non trouvé." });

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    await user.save();

    res.status(200).json({ message: "Déconnexion réussie." });
  } catch (error) {
    console.error("Erreur déconnexion:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/refresh-token – Renouvelle les tokens              */
/* ------------------------------------------------------------------ */
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "Refresh token requis" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken))
      return res.status(403).json({ message: "Token invalide." });

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Erreur refresh token:", error);
    res.status(403).json({ message: "Token expiré ou invalide." });
  }
};

/* ------------------------------------------------------------------ */
/* PUT /api/users/:id – Mise à jour du profil                         */
/* ------------------------------------------------------------------ */
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { nom, email, telephone } = req.body;

  const user = await User.findById(id);
  if (!user)
    return res.status(404).json({ message: "Utilisateur non trouvé." });

  if (user._id.toString() !== req.user.id)
    return res.status(403).json({ message: "Accès interdit." });

  if (nom) user.nom = nom;
  if (email) user.email = email;
  if (telephone) user.telephone = telephone;

  await user.save();

  res.json({
    _id: user._id,
    nom: user.nom,
    email: user.email,
    telephone: user.telephone,
  });
};

/* ------------------------------------------------------------------ */
/* POST /api/users/reset-request – Envoie un code de réinitialisation */
/* ------------------------------------------------------------------ */
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res
      .status(404)
      .json({ message: "Aucun utilisateur trouvé avec cet e-mail." });
  }

  // Vérifie si un code est déjà actif
  if (user.resetCodeExpires && user.resetCodeExpires > Date.now()) {
    const remaining = Math.ceil((user.resetCodeExpires - Date.now()) / 60000); // en minutes
    return res.status(429).json({
      message: `Un code vous a déjà été envoyé. Réessayez dans ${remaining} minute(s).`,
    });
  }

  // Génération du code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetCode = code;
  user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  await sendEmail({
    to: email,
    subject: "Code de réinitialisation de mot de passe",
    code, // c’est ce champ qui sera utilisé pour insérer dans le HTML
  });

  res.status(200).json({ message: "Code envoyé par email." });
};

/* ------------------------------------------------------------------ */
/* POST /api/users/reset-verify – Vérifie le code de réinitialisation */
/* ------------------------------------------------------------------ */
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (
      !user ||
      !user.resetCode ||
      !user.resetCodeExpires ||
      user.resetCodeExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    console.log("Code entré :", code);
    console.log("Code en DB :", user.resetCode);

    if (user.resetCode !== String(code).trim()) {
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    // ✅ Invalider le code une fois qu'il a été vérifié
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.status(200).json({ message: "Code valide." });
  } catch (error) {
    console.error("Erreur vérification code:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/reset-password – Change le mot de passe */
/* ------------------------------------------------------------------ */
exports.resetPasswordWithCode = async (req, res) => {
  const { email, code, newPassword } = req.body;

  const user = await User.findOne({ email, resetCode: code });
  if (!user || user.resetCodeExpires < Date.now()) {
    return res.status(400).json({ message: "Code invalide ou expiré." });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetCode = null;
  user.resetCodeExpires = null;
  await user.save();

  res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
};

/* ------------------------------------------------------------------ */
/* GET /api/users/search – Rechercher des utilisateurs                */
/* ------------------------------------------------------------------ */
exports.searchUsers = async (req, res) => {
  try {
    const { nom, email } = req.query;
    const query = [];

    if (nom) query.push({ nom: { $regex: nom, $options: "i" } });
    if (email) query.push({ email: { $regex: email, $options: "i" } });

    const users = await User.find(query.length ? { $or: query } : {}).select(
      "_id nom email"
    );

    res.json(users);
  } catch (error) {
    console.error("Erreur dans /search :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
