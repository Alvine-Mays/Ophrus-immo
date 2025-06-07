// services/emailService.js
const nodemailer = require('nodemailer');
const hbs        = require('nodemailer-express-handlebars');
const path       = require('path');
const { logger } = require('../utils/logging');
const emailConfig= require('../config/emailTemplates');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.use('compile', hbs({
  viewEngine: {
    extname: emailConfig.extName,
    layoutsDir: path.resolve(emailConfig.layoutsDir),
    partialsDir:path.resolve(emailConfig.partialsDir),
    defaultLayout: emailConfig.defaultLayout,
  },
  viewPath: path.resolve('views/emails/templates'),
  extName: emailConfig.extName,
}));

exports.emailService = {
  send: async ({ to, subject, template, context }) => {
    try {
      await transporter.sendMail({
        from:    process.env.EMAIL_FROM,
        to, subject,
        template,
        context,
      });
      logger.info(`Email envoyé → ${to} (${template})`);
    } catch (err) {
      logger.error('Erreur envoi email', { error: err.message, to, template });
      throw err;
    }
  }
};
