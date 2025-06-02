/* controllers/propertyController.js */
const Property   = require("../models/Property");
const User       = require("../models/User");
const cloudinary = require("../config/cloudinary");   // assure-toi d’avoir utils/cloudinary.js
const asyncHandler = require("express-async-handler");

/* ------------------------------------------------------------------ */
/*  Gestion des favoris                                               */
/* ------------------------------------------------------------------ */
const toggleFavori = asyncHandler(async (req, res) => {
  const userId     = req.user.id;
  const propertyId = req.params.id;

  const user     = await User.findById(userId);
  const property = await Property.findById(propertyId);

  if (!property) return res.status(404).json({ message: "Bien introuvable." });

  const indexUser     = user.favoris.indexOf(propertyId);
  const indexProperty = property.favoris.indexOf(userId);

  if (indexUser !== -1) {
    user.favoris.splice(indexUser, 1);
    property.favoris.splice(indexProperty, 1);
  } else {
    user.favoris.push(propertyId);
    property.favoris.push(userId);
  }

  await user.save();
  await property.save();

  res.json({ message: "Favoris mis à jour avec succès." });
});

/* ------------------------------------------------------------------ */
/*  Créer un bien (upload images -> Cloudinary)                       */
/* ------------------------------------------------------------------ */
const creerProperty = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "Aucune image téléchargée." });

  // Upload chaque image vers Cloudinary
  const images = [];
  for (const file of req.files) {
    const up = await cloudinary.uploader.upload(file.path, {
      folder: "ophrus-annonces",
    });
    images.push({ url: up.secure_url, public_id: up.public_id });
  }

  const nouveauBien = await Property.create({
    titre:       req.body.titre,
    description: req.body.description,
    prix:        req.body.prix,
    ville:       req.body.ville,
    adresse:     req.body.adresse,
    categorie:   req.body.categorie,
    images,
    utilisateur: req.user.id,
  });

  res.status(201).json({ message: "Annonce créée avec succès.", property: nouveauBien });
});

/* ------------------------------------------------------------------ */
/*  Lire toutes les annonces (filtres + pagination)                   */
/* ------------------------------------------------------------------ */
const getAllProperty = asyncHandler(async (req, res) => {
  const { ville, categorie, prixMin, prixMax, search, page = 1, limit = 10 } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { titre:       { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { ville:       { $regex: search, $options: "i" } },
      { categorie:   { $regex: search, $options: "i" } },
    ];
  }
  if (ville)     query.ville   = ville;
  if (categorie) query.categorie = categorie;
  if (prixMin || prixMax) {
    query.prix = {};
    if (prixMin) query.prix.$gte = Number(prixMin);
    if (prixMax) query.prix.$lte = Number(prixMax);
  }

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Property.countDocuments(query);

  const properties = await Property.find(query)
    .populate("utilisateur", "nom email")
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const categories = [...new Set(properties.map(p => p.categorie))];

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    properties,
    categories,
  });
});

/* ------------------------------------------------------------------ */
/*  Lire une annonce par ID                                           */
/* ------------------------------------------------------------------ */
const getPropertyById = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate("utilisateur", "nom email");

  if (!property)
    return res.status(404).json({ message: "Bien introuvable." });

  res.json(property);
});

/* ------------------------------------------------------------------ */
/*  Supprimer une annonce                                             */
/* ------------------------------------------------------------------ */
const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ message: "Bien introuvable." });

  if (property.utilisateur.toString() !== req.user.id)
    return res.status(401).json({ message: "Non autorisé." });

  // Détruire les images sur Cloudinary
  for (const img of property.images) {
    if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
  }

  await property.deleteOne();
  res.json({ message: "Bien supprimé." });
});

/* ------------------------------------------------------------------ */
/*  Mettre à jour une annonce                                         */
/* ------------------------------------------------------------------ */
const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ message: "Bien introuvable." });

  if (property.utilisateur.toString() !== req.user.id)
    return res.status(401).json({ message: "Non autorisé." });

  // Si de nouvelles images arrivent, remplacer les anciennes
  if (req.files && req.files.length > 0) {
    // Détruire les anciennes
    for (const img of property.images) {
      if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
    }
    // Uploader les nouvelles
    const nouvellesImages = [];
    for (const file of req.files) {
      const up = await cloudinary.uploader.upload(file.path, {
        folder: "ophrus-annonces",
      });
      nouvellesImages.push({ url: up.secure_url, public_id: up.public_id });
    }
    property.images = nouvellesImages;
  }

  const champs = ["titre", "description", "prix", "ville", "adresse", "categorie"];
  champs.forEach(c => { if (req.body[c]) property[c] = req.body[c]; });

  await property.save();
  res.json({ message: "Bien mis à jour avec succès.", property });
});

/* ------------------------------------------------------------------ */
/*  Noter une annonce                                                 */
/* ------------------------------------------------------------------ */
const rateProperty = asyncHandler(async (req, res) => {
  const { rating } = req.body;
  const property   = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ message: "Bien introuvable." });

  const existing = property.evaluations.find(e => e.utilisateur.toString() === req.user.id);
  if (existing) existing.note = rating;
  else property.evaluations.push({ utilisateur: req.user.id, note: rating });

  // Recalcul de la moyenne
  const total = property.evaluations.reduce((acc, cur) => acc + cur.note, 0);
  property.noteMoyenne = total / property.evaluations.length;

  await property.save();
  res.json({ message: "Note mise à jour.", noteMoyenne: property.noteMoyenne });
});

/* ------------------------------------------------------------------ */
/*  Obtenir annonce + rating user + moyenne                           */
/* ------------------------------------------------------------------ */
const getPropertyWithRating = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate("evaluations.utilisateur", "nom");

  if (!property) return res.status(404).json({ message: "Bien introuvable." });

  const userRate = property.evaluations.find(e => e.utilisateur._id.toString() === req.user.id);

  res.json({
    property,
    userRating:  userRate ? userRate.note : null,
    averageRating: property.noteMoyenne,
  });
});

/* ------------------------------------------------------------------ */
module.exports = {
  creerProperty,
  getAllProperty,
  getPropertyById,
  deleteProperty,
  updateProperty,
  toggleFavori,
  rateProperty,
  getPropertyWithRating,
};
