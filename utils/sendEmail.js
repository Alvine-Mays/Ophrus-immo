const nodemailer = require('nodemailer');
const path = require('path');
const { logger } = require('../utils/logging');

let transporter;

const initEmailTransporter = async () => {
  const { default: hbs } = await import('nodemailer-express-handlebars');

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASSWORD,
    },
  });

  const handlebarOptions = {
    viewEngine: {
      extname: '.hbs',
      partialsDir: path.resolve('./views/emails/partials'),
      layoutsDir: path.resolve('./views/emails/layouts'),
      defaultLayout: 'main',
    },
    viewPath: path.resolve('./views/emails'),
    extName: '.hbs',
  };

  transporter.use('compile', hbs(handlebarOptions));

  logger.info("Le transporteur email est initialisé");
};

const sendResetPasswordEmail = async (options) => {
  if (!transporter) {
    throw new Error("Le transporteur n’est pas encore initialisé !");
  }

  const mailOptions = {
    from: `"${process.env.APP_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    template: options.template,
    context: {
      ...options.context,
      appName: process.env.APP_NAME,
      appUrl: process.env.FRONTEND_URL,
      currentYear: new Date().getFullYear(),
    },
    // attachments: [{
    //   filename: 'logo.png',
    //   path: path.resolve('./public/images/logo.png'),
    //   cid: 'logo'
    // }]
  };

  try {
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

module.exports = {
  initEmailTransporter,
  sendResetPasswordEmail
};
