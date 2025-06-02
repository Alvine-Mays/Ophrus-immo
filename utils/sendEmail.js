const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mayalachristgottlieb@gmail.com",
    pass: "ueevblhcjwjtudzw", // mot de passe d'application, pas le mot de passe normal
  },
});

// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",  // ✅ important
//   port: 587,
//   secure: false, // TLS (STARTTLS) activé automatiquement
//   auth: {
//     user: process.env.BREVO_USER,       // par ex. contact@tondomaine.com
//     pass: process.env.BREVO_PASSWORD,   // clé API SMTP
//   },
// });


const sendEmail = async ({ to, subject, code }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :</p>
      <div style="font-size: 24px; font-weight: bold; background-color: #f3f3f3; padding: 15px; border-radius: 5px; text-align: center; letter-spacing: 5px;">
        ${code}
      </div>
      <p style="margin-top: 20px;">Ce code est valable pendant 10 minutes.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.</p>
      <p style="margin-top: 30px;">– L’équipe de Ophrus Immo</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Support Ophrus Immo" <${process.env.BREVO}>`,
      to,
      subject,
      html,
    });
    console.log("📧 Email envoyé :", info.response);
  } catch (err) {
    console.error("❌ Erreur d’envoi d’email :", err);
  }
};

module.exports = sendEmail;
