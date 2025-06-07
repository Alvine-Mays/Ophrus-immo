// config/swagger.js
const swaggerJsdoc   = require('swagger-jsdoc');
const swaggerUi      = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Ophrus Immo API',
      version:     '1.0.0',
      description: 'API de gestion immobilière',
    },
    servers: [
      { url: 'https://api.ophrus-immo.com', description: 'Prod' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:   'http',
          scheme: 'bearer',
        },
      },
    },
    security: [ { bearerAuth: [] } ],
  },
  apis: [ './routes/*.js', './controllers/*.js' ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
