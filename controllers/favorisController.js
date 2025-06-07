const Annonce = require("../models/Property");
const User = require("../models/User");
const { logger } = require('../utils/logging');

// Ajouter ou retirer un favori
const toggleFavori = async (req, res) => {
  try {
    const userId = req.user.id;
    const annonceId = req.params.id;
    logger.debug(`Toggle favori - User: ${userId}, Annonce: ${annonceId}`);

    const user = await User.findById(userId);
    const annonce = await Annonce.findById(annonceId);

    if (!user || !annonce) {
      logger.warn(`Utilisateur ou annonce introuvable - User: ${userId}, Annonce: ${annonceId}`);
      return res.status(404).json({ message: "Utilisateur ou annonce introuvable." });
    }

    const userFavoris = user.favoris.map(f => f.toString());
    const annonceFavoris = annonce.favoris.map(f => f.toString());
    const dejaFavori = userFavoris.includes(annonceId);

    if (dejaFavori) {
      user.favoris = user.favoris.filter(f => f.toString() !== annonceId);
      annonce.favoris = annonce.favoris.filter(u => u.toString() !== userId);
      logger.info(`Annonce retirée des favoris - User: ${userId}, Annonce: ${annonceId}`);
    } else {
      user.favoris.push(annonceId);
      annonce.favoris.push(userId);
      logger.info(`Annonce ajoutée aux favoris - User: ${userId}, Annonce: ${annonceId}`);
    }

    await user.save();
    await annonce.save();

    logger.debug(`Mise à jour favoris réussie - User: ${userId}, Total favoris: ${user.favoris.length}`);
    
    res.json({
      message: dejaFavori ? "Annonce retirée des favoris." : "Annonce ajoutée aux favoris.",
      favoris: user.favoris,
    });
  } catch (err) {
    logger.error(`Erreur toggle favori: ${err.message}`, {
      stack: err.stack,
      userId: req.user?.id,
      annonceId: req.params.id
    });
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour des favoris." });
  }
};

// Récupérer les favoris de l'utilisateur
const getFavoris = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.debug(`Récupération favoris - User: ${userId}`);

    const user = await User.findById(userId).populate("favoris");

    if (!user) {
      logger.warn(`Utilisateur introuvable - User: ${userId}`);
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    logger.info(`Favoris récupérés - User: ${userId}, Total: ${user.favoris.length}`);
    res.json(user.favoris);
  } catch (err) {
    logger.error(`Erreur récupération favoris: ${err.message}`, {
      stack: err.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: "Erreur serveur lors de la récupération des favoris." });
  }
};

module.exports = { toggleFavori, getFavoris };