const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { toggleFavori, getFavoris } = require("../controllers/favorisController");

const router = express.Router();

// Ajouter ou retirer un favori
router.post("/:id", protect, toggleFavori); // Ajout ou retrait d'un favori

// Récupérer tous les favoris de l'utilisateur
router.get("/", protect, getFavoris); // Récupérer la liste des favoris

module.exports = router;
