const Property = require("../models/Property");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const asyncHandler = require("express-async-handler");
const { logger } = require('../utils/logging');

/* ------------------------------------------------------------------ */
/*  Gestion des favoris                                               */
/* ------------------------------------------------------------------ */
const toggleFavori = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const propertyId = req.params.id;
    logger.debug(`Toggle favoris - User: ${userId}, Property: ${propertyId}`);

    const user = await User.findById(userId);
    const property = await Property.findById(propertyId);

    if (!property) {
      logger.warn(`Bien non trouvé pour favoris: ${propertyId}`);
      return res.status(404).json({ message: "Bien introuvable." });
    }

    const wasFavorite = user.favoris.includes(propertyId);
    const indexUser = user.favoris.indexOf(propertyId);
    const indexProperty = property.favoris.indexOf(userId);

    if (indexUser !== -1) {
      user.favoris.splice(indexUser, 1);
      property.favoris.splice(indexProperty, 1);
      logger.info(`Bien retiré des favoris - User: ${userId}, Property: ${propertyId}`);
    } else {
      user.favoris.push(propertyId);
      property.favoris.push(userId);
      logger.info(`Bien ajouté aux favoris - User: ${userId}, Property: ${propertyId}`);
    }

    await user.save();
    await property.save();

    res.json({ 
      message: "Favoris mis à jour avec succès.",
      isFavorite: !wasFavorite
    });
  } catch (error) {
    logger.error(`Erreur toggle favoris: ${error.message}`, {
      stack: error.stack,
      userId: req.user?.id,
      propertyId: req.params.id
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* ------------------------------------------------------------------ */
/*  Créer un bien (upload images -> Cloudinary)                       */
/* ------------------------------------------------------------------ */
const creerProperty = asyncHandler(async (req, res) => {
  try {
    logger.debug(`Tentative création bien par user: ${req.user.id}`, {
      filesCount: req.files?.length,
      body: { ...req.body, images: '[...]' }
    });

    if (!req.files || req.files.length === 0) {
      logger.warn("Aucune image fournie pour la création de bien");
      return res.status(400).json({ message: "Aucune image téléchargée." });
    }

    const images = [];
    logger.info(`Début upload ${req.files.length} images vers Cloudinary`);
    
    for (const file of req.files) {
      try {
        const up = await cloudinary.uploader.upload(file.path, {
          folder: "ophrus-annonces",
        });
        images.push({ url: up.secure_url, public_id: up.public_id });
        logger.debug(`Image uploadée: ${up.public_id}`);
      } catch (uploadError) {
        logger.error(`Erreur upload Cloudinary: ${uploadError.message}`, {
          stack: uploadError.stack,
          file: file.originalname
        });
        throw new Error("Erreur lors de l'upload des images");
      }
    }

    const nouveauBien = await Property.create({
      titre: req.body.titre,
      description: req.body.description,
      prix: req.body.prix,
      ville: req.body.ville,
      adresse: req.body.adresse,
      categorie: req.body.categorie,
      images,
      utilisateur: req.user.id,
    });

    logger.info(`Nouveau bien créé ID: ${nouveauBien._id}`, {
      titre: nouveauBien.titre,
      ville: nouveauBien.ville,
      imagesCount: nouveauBien.images.length
    });

    res.status(201).json({ 
      message: "Annonce créée avec succès.", 
      property: nouveauBien 
    });
  } catch (error) {
    logger.error(`Erreur création bien: ${error.message}`, {
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: error.message || "Erreur serveur" });
  }
});

/* ------------------------------------------------------------------ */
/*  Lire toutes les annonces (filtres + pagination)                   */
/* ------------------------------------------------------------------ */
const getAllProperty = asyncHandler(async (req, res) => {
  try {
    const { ville, categorie, prixMin, prixMax, search, page = 1, limit = 10 } = req.query;
    logger.debug("Recherche de biens avec filtres", { query: req.query });

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
    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .populate("utilisateur", "nom email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const categories = [...new Set(properties.map(p => p.categorie))];

    logger.info(`Résultats recherche - ${properties.length}/${total} biens trouvés`, {
      page,
      limit,
      filters: Object.keys(query).length
    });

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      properties,
      categories,
    });
  } catch (error) {
    logger.error(`Erreur recherche biens: ${error.message}`, {
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* ------------------------------------------------------------------ */
/*  Lire une annonce par ID                                           */
/* ------------------------------------------------------------------ */
const getPropertyById = asyncHandler(async (req, res) => {
  try {
    const propertyId = req.params.id;
    logger.debug(`Consultation bien ID: ${propertyId}`);

    const property = await Property.findById(propertyId)
      .populate("utilisateur", "nom email");

    if (!property) {
      logger.warn(`Bien non trouvé: ${propertyId}`);
      return res.status(404).json({ message: "Bien introuvable." });
    }

    logger.info(`Bien consulté ID: ${property._id}`, {
      titre: property.titre,
      vues: property.vues // Si vous avez un champ de visites
    });

    res.json(property);
  } catch (error) {
    logger.error(`Erreur consultation bien: ${error.message}`, {
      stack: error.stack,
      propertyId: req.params.id
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* ------------------------------------------------------------------ */
/*  Supprimer une annonce                                             */
/* ------------------------------------------------------------------ */
const deleteProperty = asyncHandler(async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user.id;
    logger.debug(`Tentative suppression bien ID: ${propertyId} par user: ${userId}`);

    const property = await Property.findById(propertyId);
    if (!property) {
      logger.warn(`Bien non trouvé pour suppression: ${propertyId}`);
      return res.status(404).json({ message: "Bien introuvable." });
    }

    if (property.utilisateur.toString() !== userId) {
      logger.warn(`Tentative suppression non autorisée - User: ${userId}, Propriétaire: ${property.utilisateur}`);
      return res.status(401).json({ message: "Non autorisé." });
    }

    logger.info(`Début suppression ${property.images.length} images Cloudinary`);
    for (const img of property.images) {
      if (img.public_id) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
          logger.debug(`Image supprimée: ${img.public_id}`);
        } catch (cloudinaryError) {
          logger.error(`Erreur suppression Cloudinary: ${cloudinaryError.message}`, {
            public_id: img.public_id
          });
        }
      }
    }

    await property.deleteOne();
    logger.info(`Bien supprimé ID: ${propertyId}`);

    res.json({ message: "Bien supprimé." });
  } catch (error) {
    logger.error(`Erreur suppression bien: ${error.message}`, {
      stack: error.stack,
      propertyId: req.params.id,
      userId: req.user?.id
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* ------------------------------------------------------------------ */
/*  Mettre à jour une annonce                                         */
/* ------------------------------------------------------------------ */
const updateProperty = asyncHandler(async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user.id;
    logger.debug(`Tentative mise à jour bien ID: ${propertyId}`, {
      filesCount: req.files?.length,
      updatedFields: Object.keys(req.body)
    });

    const property = await Property.findById(propertyId);
    if (!property) {
      logger.warn(`Bien non trouvé pour mise à jour: ${propertyId}`);
      return res.status(404).json({ message: "Bien introuvable." });
    }

    if (property.utilisateur.toString() !== userId) {
      logger.warn(`Tentative MAJ non autorisée - User: ${userId}, Propriétaire: ${property.utilisateur}`);
      return res.status(401).json({ message: "Non autorisé." });
    }

    if (req.files && req.files.length > 0) {
      logger.info(`Remplacement ${property.images.length} images existantes`);
      for (const img of property.images) {
        if (img.public_id) {
          try {
            await cloudinary.uploader.destroy(img.public_id);
            logger.debug(`Ancienne image supprimée: ${img.public_id}`);
          } catch (cloudinaryError) {
            logger.error(`Erreur suppression Cloudinary: ${cloudinaryError.message}`, {
              public_id: img.public_id
            });
          }
        }
      }

      const nouvellesImages = [];
      for (const file of req.files) {
        try {
          const up = await cloudinary.uploader.upload(file.path, {
            folder: "ophrus-annonces",
          });
          nouvellesImages.push({ url: up.secure_url, public_id: up.public_id });
          logger.debug(`Nouvelle image uploadée: ${up.public_id}`);
        } catch (uploadError) {
          logger.error(`Erreur upload nouvelle image: ${uploadError.message}`, {
            file: file.originalname
          });
          throw new Error("Erreur lors du remplacement des images");
        }
      }
      property.images = nouvellesImages;
    }

    const champs = ["titre", "description", "prix", "ville", "adresse", "categorie"];
    champs.forEach(c => { if (req.body[c]) property[c] = req.body[c]; });

    await property.save();
    logger.info(`Bien mis à jour ID: ${propertyId}`, {
      updatedFields: champs.filter(c => req.body[c])
    });

    res.json({ 
      message: "Bien mis à jour avec succès.", 
      property 
    });
  } catch (error) {
    logger.error(`Erreur mise à jour bien: ${error.message}`, {
      stack: error.stack,
      propertyId: req.params.id,
      userId: req.user?.id
    });
    res.status(500).json({ message: error.message || "Erreur serveur" });
  }
});

/* ------------------------------------------------------------------ */
/*  Noter une annonce                                                 */
/* ------------------------------------------------------------------ */
const rateProperty = asyncHandler(async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user.id;
    const { rating } = req.body;
    logger.debug(`Nouvelle notation - Bien: ${propertyId}, User: ${userId}, Note: ${rating}`);

    const property = await Property.findById(propertyId);
    if (!property) {
      logger.warn(`Bien non trouvé pour notation: ${propertyId}`);
      return res.status(404).json({ message: "Bien introuvable." });
    }

    const existing = property.evaluations.find(e => e.utilisateur.toString() === userId);
    if (existing) {
      existing.note = rating;
      logger.debug(`Note existante mise à jour: ${existing.note} → ${rating}`);
    } else {
      property.evaluations.push({ utilisateur: userId, note: rating });
      logger.debug(`Nouvelle note ajoutée`);
    }

    const total = property.evaluations.reduce((acc, cur) => acc + cur.note, 0);
    property.noteMoyenne = total / property.evaluations.length;
    logger.debug(`Nouvelle moyenne calculée: ${property.noteMoyenne.toFixed(2)}`);

    await property.save();
    logger.info(`Note enregistrée - Bien: ${propertyId}, Moyenne: ${property.noteMoyenne.toFixed(2)}`);

    res.json({ 
      message: "Note mise à jour.", 
      noteMoyenne: property.noteMoyenne 
    });
  } catch (error) {
    logger.error(`Erreur notation bien: ${error.message}`, {
      stack: error.stack,
      propertyId: req.params.id,
      userId: req.user?.id
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* ------------------------------------------------------------------ */
/*  Obtenir annonce + rating user + moyenne                           */
/* ------------------------------------------------------------------ */
const getPropertyWithRating = asyncHandler(async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user.id;
    logger.debug(`Consultation bien avec notes ID: ${propertyId}`);

    const property = await Property.findById(propertyId)
      .populate("evaluations.utilisateur", "nom");

    if (!property) {
      logger.warn(`Bien non trouvé pour consultation notes: ${propertyId}`);
      return res.status(404).json({ message: "Bien introuvable." });
    }

    const userRate = property.evaluations.find(e => e.utilisateur._id.toString() === userId);
    logger.debug(`Note utilisateur récupérée: ${userRate?.note || 'aucune'}`);

    res.json({
      property,
      userRating: userRate ? userRate.note : null,
      averageRating: property.noteMoyenne,
    });
  } catch (error) {
    logger.error(`Erreur consultation notes bien: ${error.message}`, {
      stack: error.stack,
      propertyId: req.params.id
    });
    res.status(500).json({ message: "Erreur serveur" });
  }
});

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