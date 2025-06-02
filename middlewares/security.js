const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const hpp          = require('hpp');
const cors         = require('cors');
const sanitizeBody = require('mongo-sanitize');
const xss          = require('xss-clean');
const { body, validationResult } = require('express-validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const disposableDomains = require('disposable-email-domains');
const fs = require('fs');

// Logger
const logFile = fs.createWriteStream('./logs/server.log', { flags: 'a' });
exports.logger = (req, res, next) => {
  const now = new Date().toISOString();
  logFile.write(`[${now}] ${req.method} ${req.originalUrl} - IP: ${req.ip}\n`);
  next();
};

// Fonction qui vérifie si l'email est temporaire
const isTempEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
};

// Sécurité des headers HTTP
exports.secureHeaders = helmet({
  contentSecurityPolicy: {},
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' }
});

// Limitation de requêtes par IP (100 requêtes toutes les 15 minutes)
exports.limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Trop de requêtes depuis cette IP. Réessayez plus tard.'
  },
  handler: (req, res, next, options) => {
    console.warn(`⛔ IP ${req.ip} bloquée (rate limit)`);
    res.status(options.statusCode).json(options.message);
  }
});

// Protection contre les attaques par pollution de paramètres HTTP
exports.preventHPP = hpp();

// CORS : autorise certaines origines seulement
const whitelist = ['http://localhost:3000', 'https://app.monsite.com'];
exports.corsOptions = cors({
  origin(origin, cb) {
    if (!origin || whitelist.includes(origin)) return cb(null, true);
    cb(new Error('Origine non autorisée'));
  },
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  credentials: true
});

// Nettoyage des inputs pour éviter les injections MongoDB
exports.sanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeBody(req.body);
  if (req.params) req.params = sanitizeBody(req.params);
  next();
};

// Nettoyage XSS global (XSS Clean renforcé)
exports.xssSanitizeAll = (req, res, next) => {
  const xss = require('xss');
  const clean = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean(obj[key]);
      }
    }
  };
  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
};

// Validation inscription
exports.validateUser = [
  body('telephone')
    .custom(value => {
      let phone = parsePhoneNumberFromString(value, 'CG');
      if (phone && phone.isValid() && phone.country === 'CG') return true;
      phone = parsePhoneNumberFromString(value);
      if (!phone || !phone.isValid()) {
        if (!value.startsWith('+')) {
          throw new Error("Veuillez ajouter l'indicatif international (ex: +33)");
        }
        throw new Error('Numéro de téléphone invalide');
      }
      return true;
    }),
  body('nom')
    .isString().withMessage('Le nom doit être une chaîne de caractères')
    .isLength({ min: 2 }).withMessage('Le nom est trop court'),
  body('email')
    .isEmail().withMessage('Email invalide')
    .bail()
    .custom(email => {
      if (isTempEmail(email)) {
        throw new Error('Les emails temporaires sont interdits');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit faire au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Doit contenir au moins un chiffre')
    .matches(/\W/).withMessage('Doit contenir au moins un caractère spécial'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation login
exports.validateLogin = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Validation reset-request
exports.validateResetRequest = [
  body('email').isEmail().withMessage('Email invalide'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Validation reset-verify
exports.validateResetVerify = [
  body('email').isEmail().withMessage('Email invalide'),
  body('code').isLength({ min: 4 }).withMessage('Code requis'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Validation reset-password
exports.validateResetPassword = [
  body('email').isEmail().withMessage('Email invalide'),
  body('code').notEmpty().withMessage('Code requis'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit faire au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Doit contenir au moins un chiffre')
    .matches(/\W/).withMessage('Doit contenir au moins un caractère spécial'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Limite de requêtes de réinitialisation par email/IP
exports.resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5,
  message: {
    message: "Trop de tentatives de réinitialisation. Réessayez dans une heure."
  },
  standardHeaders: true,
  legacyHeaders: false
});
