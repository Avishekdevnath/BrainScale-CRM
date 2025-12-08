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
  // Fallback to generating at runtime if file doesn't exist
  let swaggerSpec: swaggerJSDoc.OAS3Definition;
  
  // Try multiple possible paths for swagger.json (works in both traditional and serverless environments)
  // In Vercel, the working directory and __dirname may differ from traditional servers
  const possiblePaths = [
    path.join(__dirname, '../swagger.json'), // Traditional server: dist/swagger.json (from dist/config/swagger.js)
    path.join(__dirname, '../../swagger.json'), // Alternative: from dist/
    path.join(process.cwd(), 'dist', 'swagger.json'), // Serverless: from project root
    path.join(process.cwd(), 'backend', 'dist', 'swagger.json'), // If backend is subdirectory
    path.join(process.cwd(), 'swagger.json'), // Alternative location
  ];
  
  let swaggerJsonPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      swaggerJsonPath = possiblePath;
      console.log(`✅ Found Swagger spec at: ${swaggerJsonPath}`);
      break;
    }
  }
  
  if (!swaggerJsonPath) {
    console.warn('⚠️  Swagger spec file not found. Attempted paths:', possiblePaths);
  }
  
  if (swaggerJsonPath) {
    // Load pre-generated spec from build
    try {
      const swaggerJson = fs.readFileSync(swaggerJsonPath, 'utf-8');
      swaggerSpec = JSON.parse(swaggerJson) as swaggerJSDoc.OAS3Definition;
    } catch (error) {
      console.warn('Failed to load pre-generated Swagger spec, generating at runtime:', error);
      // Update apis paths for runtime generation (use dist files in production)
      const runtimeOptions = {
        ...options,
        apis: process.env.NODE_ENV === 'production' 
          ? ['./dist/modules/**/*.js'] // Use compiled JS files in production
          : options.apis, // Use TS files in development
      };
      swaggerSpec = swaggerJSDoc(runtimeOptions) as swaggerJSDoc.OAS3Definition;
    }
  } else {
    // Generate at runtime (fallback)
    // Update apis paths based on environment
    const runtimeOptions = {
      ...options,
      apis: process.env.NODE_ENV === 'production' 
        ? ['./dist/modules/**/*.js'] // Use compiled JS files in production
        : options.apis, // Use TS files in development
    };
    swaggerSpec = swaggerJSDoc(runtimeOptions) as swaggerJSDoc.OAS3Definition;
  }
  
  // Mount Swagger UI
  // Serve assets locally from swagger-ui-express (no CDN needed)
  // This avoids CSP issues since all assets are served from 'self'
  const swaggerUiOptions = {
    customSiteTitle: 'BrainScale CRM API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      // Load spec from JSON endpoint
      url: '/api/docs.json',
      persistAuthorization: true,
    },
  };
  
  // Mount Swagger UI - serveFiles handles static assets, setup handles the main page
  // swagger-ui-express serves all JS/CSS from node_modules, so they're served from 'self'
  app.use('/api/docs', swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions));
  app.get('/api/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // JSON endpoint for Swagger spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  });
};

