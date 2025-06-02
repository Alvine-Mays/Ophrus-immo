const Annonce = require("../models/Property");
const User = require("../models/User");

// Ajouter ou retirer un favori
const toggleFavori = async (req, res) => {
  try {
    const userId = req.user.id;
    const annonceId = req.params.id;

    // Vérifier si l'utilisateur et l'annonce existent
    const user = await User.findById(userId);
    const annonce = await Annonce.findById(annonceId);

    if (!user || !annonce) {
      return res.status(404).json({ message: "Utilisateur ou annonce introuvable." });
    }

    // Convertir les favoris en tableau de strings pour comparaison
    const userFavoris = user.favoris.map(f => f.toString());
    const annonceFavoris = annonce.favoris.map(f => f.toString());

    // Vérifier si l'annonce est déjà dans les favoris de l'utilisateur
    const dejaFavori = userFavoris.includes(annonceId);

    if (dejaFavori) {
      // Retirer l'annonce des favoris
      user.favoris = user.favoris.filter(f => f.toString() !== annonceId);
      annonce.favoris = annonce.favoris.filter(u => u.toString() !== userId);
    } else {
      // Ajouter l'annonce aux favoris
      user.favoris.push(annonceId);
      annonce.favoris.push(userId);
    }

    // Sauvegarder les modifications dans la base de données
    await user.save();
    await annonce.save();

    res.json({
      message: dejaFavori ? "Annonce retirée des favoris." : "Annonce ajoutée aux favoris.",
      favoris: user.favoris,
    });
  } catch (err) {
    console.error("Erreur favoris:", err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour des favoris." });
  }
};

// Récupérer les favoris de l'utilisateur
const getFavoris = async (req, res) => {
  try {
    // Récupérer l'utilisateur avec ses favoris peuplés
    const user = await User.findById(req.user.id).populate("favoris");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    res.json(user.favoris);
  } catch (err) {
    console.error("Erreur récupération favoris:", err);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des favoris." });
  }
};

module.exports = { toggleFavori, getFavoris };
