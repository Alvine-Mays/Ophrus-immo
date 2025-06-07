const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ophrus-Immo API",
      version: "1.0.0",
      description: "Documentation de l'API REST pour Ophrus-Immo",
    },
    servers: [
      {
        url: "http://localhost:5000/api",
        description: "Serveur de développement",
      },
    ],
    components: {
      schemas: {
        UserRegister: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" }
          }
        },
        UserLogin: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" }
          }
        },
        ResetRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" }
          }
        },
        ResetVerify: {
          type: "object",
          required: ["email", "code"],
          properties: {
            email: { type: "string", format: "email" },
            code: { type: "string" }
          }
        },
        ResetPassword: {
          type: "object",
          required: ["email", "code", "newPassword"],
          properties: {
            email: { type: "string" },
            code: { type: "string" },
            newPassword: { type: "string", format: "password" }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },

  // ✅ Correction ici : chemin absolu vers les routes
  apis: [path.join(__dirname, "../routes/**/*.js")]
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
