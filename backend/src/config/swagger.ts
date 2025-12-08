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
  // Use CDN for static assets to avoid serverless static file serving issues
  // In Vercel serverless, static files from node_modules aren't served correctly,
  // so we use CDN-hosted assets instead
  const swaggerUiOptions = {
    customSiteTitle: 'BrainScale CRM API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    // Use CDN for Swagger UI assets (fixes MIME type issues in serverless)
    // This tells swagger-ui-express to use external CDN instead of trying to serve from node_modules
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js',
    ],
    swaggerOptions: {
      // Load spec from JSON endpoint
      url: '/api/docs.json',
      persistAuthorization: true,
    },
  };
  
  // Mount Swagger UI
  // Handle static asset requests first (before the main docs route)
  // These routes catch requests for swagger-ui assets and redirect to CDN
  app.get('/api/docs/swagger-ui.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.redirect(302, 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css');
  });
  app.get('/api/docs/swagger-ui-bundle.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.redirect(302, 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js');
  });
  app.get('/api/docs/swagger-ui-standalone-preset.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.redirect(302, 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js');
  });
  
  // Handle favicon requests (Swagger UI tries to load these)
  app.get('/api/docs/favicon-32x32.png', (req, res) => {
    res.status(204).end(); // No content
  });
  app.get('/api/docs/favicon-16x16.png', (req, res) => {
    res.status(204).end(); // No content
  });
  
  // Mount the main Swagger UI page
  // Use serveFiles for static assets, then setup for the main route
  app.use('/api/docs', swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions));
  app.get('/api/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // JSON endpoint for Swagger spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  });
};

