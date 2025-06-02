// backend/routes/propertyRoutes.js
const express = require("express");
const router = express.Router();
const {
  creerProperty,
  getAllProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
  toggleFavori,
  rateProperty,
  getPropertyWithRating,
} = require("../controllers/propertyController");

const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");

// -------------------------------
// Routes pour les biens immobiliers
// -------------------------------

// Récupérer toutes les annonces (avec pagination et filtres)
router.get("/", protect, getAllProperty);

// Créer une nouvelle annonce
router.post("/", protect, upload.array("images", 10), creerProperty);

// Récupérer une annonce par ID
router.get("/:id", protect, getPropertyById);

// Mettre à jour une annonce
router.put("/:id", protect, upload.array("images", 10), updateProperty);

// Supprimer une annonce
router.delete("/:id", protect, deleteProperty);

// Ajouter/enlever des favoris
router.post("/favoris/:id", protect, toggleFavori);

// Noter une annonce
router.post("/rate/:id", protect, rateProperty);

// Obtenir l'annonce avec note utilisateur et moyenne
router.get("/rating/:id", protect, getPropertyWithRating);
router.get("/withRate/:id", protect, getPropertyWithRating);

module.exports = router;
