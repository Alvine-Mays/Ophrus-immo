const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Configuration du stockage sur Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ophrus-annonces", // Nom du dossier dans Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"], // Formats acceptés
  },
});

// Configuration de multer avec limite de taille et de fichiers
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Mo max par image
    files: 10, // Maximum 10 images par requête
  },
});

module.exports = upload;
