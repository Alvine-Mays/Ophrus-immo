const { body } = require("express-validator");

exports.createPropertyValidator = [
  body("title").notEmpty().withMessage("Le titre est requis"),
  body("prix").isNumeric().withMessage("Le prix doit être un nombre"),
  body("location").notEmpty().withMessage("La localisation est requise"),
];
