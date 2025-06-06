const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');
const { logger } = require('./logging');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Configuration des templates Handlebars
transporter.use('compile', hbs({
  viewEngine: {
    extname: '.hbs',
    partialsDir: path.resolve('./views/emails/partials'),
    layoutsDir: path.resolve('./views/emails/layouts'),
    defaultLayout: 'main',
  },
  viewPath: path.resolve('./views/emails'),
  extName: '.hbs',
}));

/**
 * Envoie un email avec template
 * @param {Object} options - { to, subject, template, context }
 */
exports.sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"Ophrus Immo" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      template: options.template,
      context: {
        ...options.context,
        appName: 'Ophrus Immo',
        appUrl: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
      attachments: [{
        filename: 'logo.png',
        path: path.resolve('./public/images/logo.png'),
        cid: 'logo'
      }]
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email envoyé à ${options.to}`, { template: options.template });
  } catch (error) {
    logger.error('Erreur envoi email', { 
      error: error.message,
      recipient: options.to 
    });
    throw error;
  }
};