const { param, body, validationResult } = require('express-validator');

exports.validateMessage = [
  body('contenu')
    .notEmpty().withMessage('Le message ne doit pas être vide')
    .isLength({ min: 5 }).withMessage('Le message doit contenir au moins 5 caractères'),

  // On valide maintenant le paramètre d'URL, pas le body
  param('receiverId')
    .notEmpty().withMessage("L'identifiant du destinataire est requis")
    .isMongoId().withMessage("Identifiant invalide"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
