const Annonce = require('../models/Annonce');
const User = require('../models/User'); 
const cloudinary = require('../config/cloudinary');
const multer = require('multer'); 

// ✅ Ajouter ou retirer une annonce des favoris
const toggleFavori = async (req, res) => {
  try {
    const userId = req.user.id;
    const annonceId = req.params.id;

    const user = await User.findById(userId);
    const annonce = await Annonce.findById(annonceId);

    if (!annonce) {
      return res.status(404).json({ message: "Annonce introuvable." });
    }

    const favoriIndexUser = user.favoris.indexOf(annonceId);
    const favoriIndexAnnonce = annonce.favoris.indexOf(userId);

    if (favoriIndexUser !== -1) {
      user.favoris.splice(favoriIndexUser, 1);
      annonce.favoris.splice(favoriIndexAnnonce, 1);
    } else {
      user.favoris.push(annonceId);
      annonce.favoris.push(userId);
    }

    await user.save();
    await annonce.save();

    res.json({ message: "Favoris mis à jour avec succès." });
  } catch (err) {
    console.error("Erreur favoris:", err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour des favoris." });
  }
};

// ✅ Créer une annonce avec upload vers Cloudinary
const creerAnnonce = async (req, res) => {
  try {
    // Vérifie si Multer a bien reçu une image
    if (!req.file) {
      return res.status(400).json({ message: "Aucune image téléchargée." });
    }

    // L'URL de l'image est déjà disponible via CloudinaryStorage
    const imageUrl = req.file.path; // Cette URL provient directement de Cloudinary

    // Créer l'annonce avec l'URL de l'image Cloudinary
    const nouvelleAnnonce = new Annonce({
      titre: req.body.titre,
      description: req.body.description,
      prix: req.body.prix,
      localisation: req.body.localisation,
      images: [imageUrl], // Enregistre l'URL de l'image dans la base
      user: req.user.id,
    });

    await nouvelleAnnonce.save();
    res.status(201).json({
      message: "Annonce créée avec succès",
      annonce: nouvelleAnnonce,
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'annonce:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ Récupérer toutes les annonces avec les catégories uniques
const getAllAnnonces = async (req, res) => {
  try {
    const { ville, categorie, prixMin, prixMax, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { titre: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { ville: { $regex: search, $options: "i" } },
        { categorie: { $regex: search, $options: "i" } },
      ];
    }

    if (ville) query.ville = ville;
    if (categorie) query.categorie = categorie;
    if (prixMin || prixMax) {
      query.prix = {};
      if (prixMin) query.prix.$gte = Number(prixMin);
      if (prixMax) query.prix.$lte = Number(prixMax);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Annonce.countDocuments(query);
    const annonces = await Annonce.find(query)
      .populate("user", "nom email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const categories = [...new Set(annonces.map((annonce) => annonce.categorie))];  // Extraire les catégories uniques

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      annonces,
      categories,
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des annonces:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ Récupérer une seule annonce par ID
const getAnnonceById = async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.id).populate("user", "nom email");
    if (!annonce) {
      return res.status(404).json({ message: "Annonce introuvable." });
    }
    res.json(annonce);
  } catch (err) {
    console.error("Erreur récupération annonce:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ Supprimer une annonce
const deleteAnnonce = async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.id);
    if (!annonce) return res.status(404).json({ message: "Annonce introuvable." });

    if (annonce.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Non autorisé." });
    }

    await Annonce.findByIdAndDelete(req.params.id);
    res.json({ message: "Annonce supprimée." });
  } catch (err) {
    console.error("Erreur suppression annonce:", err);
    res.status(500).json({ message: "Erreur serveur lors de la suppression." });
  }
};

// ✅ Modifier une annonce
const updateAnnonce = async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.id);
    if (!annonce) return res.status(404).json({ message: "Annonce introuvable." });

    if (annonce.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Non autorisé." });
    }

    if (req.files && req.files.length > 0) {
      annonce.images = req.files.map((file) => file.path); // Enregistre les nouvelles images
    }

    const champsAMettreAJour = [
      "titre", "description", "prix", "ville", "adresse", "categorie"
    ];

    champsAMettreAJour.forEach((champ) => {
      if (req.body[champ]) {
        annonce[champ] = req.body[champ];
      }
    });

    await annonce.save();
    res.json({ message: "Annonce mise à jour avec succès.", annonce });
  } catch (err) {
    console.error("Erreur update:", err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
  }
};

// ✅ Note d'une annonce 
const rateAnnonce = async (req, res) => {
  const { id } = req.params; // Get annonce ID from URL
  const { rating } = req.body; // Rating from the user
  const userId = req.user.id; // Logged-in user ID

  try {
    const annonce = await Annonce.findById(id);
    if (!annonce) {
      return res.status(404).json({ message: "Annonce not found" });
    }

    const existingRating = annonce.ratings.find((r) => r.user.toString() === userId);
    if (existingRating) {
      existingRating.rating = rating; // Update the rating
    } else {
      annonce.ratings.push({ user: userId, rating }); // Add new rating
    }

    // Recalculate the average rating
    const totalRatings = annonce.ratings.reduce((acc, curr) => acc + curr.rating, 0);
    annonce.averageRating = totalRatings / annonce.ratings.length;

    await annonce.save();

    return res.status(200).json({
      message: "Rating updated successfully",
      averageRating: annonce.averageRating,
    });
  } catch (error) {
    console.error("Error while updating rating", error);
    return res.status(500).json({ message: "Error while updating rating", error });
  }
};

// ✅ Récupérer l'annonce avec les notes de l'utilisateur et la note moyenne
const getAnnonceWithRating = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const annonce = await Annonce.findById(id).populate('ratings.user', 'username');

    if (!annonce) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    const userRating = annonce.ratings.find(rating => rating.user.toString() === userId);

    res.json({
      annonce,
      userRating: userRating ? userRating.rating : null,
      averageRating: annonce.averageRating,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'annonce', error);
    res.status(500).json({ message: 'Erreur interne' });
  }
};

module.exports = {
  creerAnnonce,
  getAllAnnonces,
  getAnnonceById,
  deleteAnnonce,
  updateAnnonce,
  toggleFavori,
  rateAnnonce,
  getAnnonceWithRating,
};
