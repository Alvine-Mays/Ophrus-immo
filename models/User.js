const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
      maxlength: [50, "Le nom ne peut excéder 50 caractères"]
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Email invalide"
      }
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: [8, "Le mot de passe doit contenir au moins 8 caractères"],
      select: false
    },
    telephone: {
      type: String,
      required: [true, "Le téléphone est requis"],
      validate: {
        validator: function(v) {
          return /^\+?[\d\s-]{10,}$/.test(v);
        },
        message: "Numéro de téléphone invalide"
      }
    },
    role: {
      type: String,
      enum: {
        values: ["client", "admin"],
        message: "Rôle invalide"
      },
      default: "client"
    },
    favoris: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      validate: {
        validator: async function(v) {
          return await mongoose.model('Property').exists({ _id: v });
        },
        message: "Propriété introuvable"
      }
    }],
    refreshTokens: {
      type: [String],
      default: [],
      select: false
    },
    resetCode: {
      type: String,
      select: false,
      default: null
    },
    resetCodeExpires: {
      type: Date,
      select: false,
      default: null,
      index: { expires: '1h' }
    },
    deleted: {
      type: Boolean,
      default: false,
      select: false
    },
    deletedAt: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.resetCode;
        delete ret.resetCodeExpires;
        delete ret.deleted;
        delete ret.deletedAt;
        return ret;
      }
    }
  }
);

// Middleware pour exclure les utilisateurs supprimés
userSchema.pre(/^find/, function() {
  this.where({ deleted: { $ne: true } });
});

// Empêche la suppression du dernier admin
userSchema.pre('remove', async function(next) {
  if (this.role === 'admin') {
    const adminCount = await this.constructor.countDocuments({ role: 'admin', deleted: false });
    if (adminCount <= 1) {
      throw new Error("Impossible de supprimer le dernier admin");
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);