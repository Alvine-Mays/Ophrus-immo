const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sujet: {
    type: String,
    required: true,
  },
  messageInitial: {
    type: String,
    required: true,
  },
  statut: {
    type: String,
    enum: ["ouvert", "fermé"],
    default: "ouvert",
  },
  reponses: [
    {
      expediteur: {
        type: String,
        enum: ["client", "admin"],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model("Ticket", ticketSchema);
