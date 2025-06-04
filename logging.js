const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const morgan = require('morgan');

// 1. Vérification/Création du dossier logs
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'));
}

// 2. Configuration des niveaux étendus
const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  debug: 5
};

winston.addColors({
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'blue'
});

// 3. Formattage avancé
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}${stack ? '\n' + stack : ''}`;
  })
);

// 4. Configuration des transports
const logger = winston.createLogger({
  levels: logLevels,
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, 'logs/error-%DATE%.log'),
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, 'logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '90d'
    })
  ],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(__dirname, 'logs/exceptions.log')
    })
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(__dirname, 'logs/rejections.log')
    })
  ]
});

// 5. Transport Console (dev seulement)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize({ all: true }),
      logFormat
    ),
    level: 'debug'
  }));
}

// 6. Middleware Morgan optimisé
const morganMiddleware = morgan(
  ':remote-addr - :method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => logger.http(message.trim())
    },
    skip: (req) => {
      // Exclure les routes bruyantes mais non critiques
      return ['/health', '/favicon.ico'].includes(req.path);
    }
  }
);

// 7. Export des utilitaires
module.exports = {
  logger,
  morganMiddleware,
  stream: {
    write: (message) => logger.http(message.trim())
  }
};