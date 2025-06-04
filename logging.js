const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');
const morgan = require('morgan');

// Configuration des niveaux et couleurs
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'blue'
});

// Format personnalisé
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(info => {
    let message = `${info.timestamp} [${info.level}] ${info.message}`;
    if (info.stack) message += `\n${info.stack}`;
    return message;
  })
);

// Configuration des transports
const logger = winston.createLogger({
  levels: logLevels,
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, './logs/error-%DATE%.log'),
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '5m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, './logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '30d'
    })
  ],
  exceptionHandlers: [
    new transports.File({ 
      filename: path.join(__dirname, '../logs/exceptions.log') 
    })
  ]
});

// Console en développement
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(info => {
        let message = `${info.timestamp} [${info.level}] ${info.message}`;
        if (info.stack) message += `\n${info.stack}`;
        return message;
      })
    )
  }));
}

// Middleware Morgan pour les requêtes HTTP
const morganMiddleware = morgan(
  ':remote-addr - :method :url :status :res[content-length] - :response-time ms',
  {
    stream: { 
      write: (message) => logger.http(message.trim()) 
    },
    skip: (req) => req.path === '/health' // Exclure les health checks
  }
);

module.exports = {
  logger,
  morganMiddleware
};