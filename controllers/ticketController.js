const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.createTicket = async (req, res) => {
  const { sujet, message } = req.body;
  
  const ticket = new Ticket({
    user: req.userId,
    sujet,
    message,
    reference: `TICK-${Date.now()}`,
    statut: 'ouvert'
  });

  await ticket.save();

  // Envoi email
  const user = await User.findById(req.userId);
  await transporter.sendMail({
    to: user.email,
    subject: `Ticket #${ticket.reference}`,
    html: `<p>Votre ticket a été créé :</p>
           <p><strong>${sujet}</strong></p>
           <p>${message}</p>`
  });

  res.status(201).json(ticket);
};