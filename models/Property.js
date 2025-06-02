// models/Property.js 
const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    titre: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    prix: { type: Number, required: true },
    ville: { type: String, trim: true },
    adresse: { type: String, trim: true },
    categorie: {
      type: String,
      enum: ["Appartement", "Maison", "Terrain", "Commercial", "Autre"],
      default: "Autre",
    },
    images: [
      {
        url: String,
        public_id: String, // pour Cloudinary
      },
    ],
    evaluations: [
      {
        utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: { type: Number, required: true },
        creeLe: { type: Date, default: Date.now },
      },
    ],
    noteMoyenne: { type: Number, default: 0 },
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    favoris: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
     nombre_chambres: { type: Number, default: 1, min: 0 },
    nombre_salles_bain: { type: Number, default: 1, min: 0 },
    nombre_salons: { type: Number, default: 1, min: 0 },
    superficie: { type: Number, min: 0 },
    garage: { type: Boolean, default: false },
    gardien: { type: Boolean, default: false },
    balcon: { type: Boolean, default: false },
    piscine: { type: Boolean, default: false },
    jardin: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Property", propertySchema);
