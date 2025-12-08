import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { env } from './env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BrainScale CRM SaaS API',
      version: '1.0.0',
      description: 'API documentation for BrainScale CRM SaaS - Multi-Workspace Customer/Student Relationship Manager',
      contact: {
        name: 'Avishek Devnath',
        url: 'https://avishekdevnath.vercel.app/',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        VerifyEmailOtpRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            otp: {
              type: 'string',
              pattern: '^\\d{6}$',
              example: '123456',
              description: '6-digit verification code',
            },
          },
        },
        ResendVerificationOtpRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.ts', './src/modules/**/*.router.ts'],
};

export const mountSwagger = (app: Express) => {
  if (!env.SWAGGER_ENABLED) {
    return;
  }

  // Try to load pre-generated Swagger spec from dist/swagger.json
  // Fallback to generating at runtime if file doesn't exist (for development)
  let swaggerSpec: swaggerJSDoc.OAS3Definition;
  
  const swaggerJsonPath = path.join(__dirname, '../swagger.json');
  
  if (fs.existsSync(swaggerJsonPath)) {
    // Load pre-generated spec from build
    try {
      const swaggerJson = fs.readFileSync(swaggerJsonPath, 'utf-8');
      swaggerSpec = JSON.parse(swaggerJson) as swaggerJSDoc.OAS3Definition;
    } catch (error) {
      console.warn('Failed to load pre-generated Swagger spec, generating at runtime:', error);
      swaggerSpec = swaggerJSDoc(options) as swaggerJSDoc.OAS3Definition;
    }
  } else {
    // Fallback: generate at runtime (for development)
    swaggerSpec = swaggerJSDoc(options) as swaggerJSDoc.OAS3Definition;
  }
  
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'BrainScale CRM API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));
  
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

