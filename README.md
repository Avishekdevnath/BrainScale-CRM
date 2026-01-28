# BrainScale CRM

BrainScale CRM is a multi-tenant CRM for managing students/customers, call workflows, follow-ups, and team collaboration. The repository contains a Node.js/TypeScript API and a Next.js web frontend.

## Features

- Multi-workspace tenancy with roles and permissions
- Students/customers, groups, batches, and courses
- Call lists, call logs, and follow-up scheduling
- Import/export flows and audit logging
- Payments tracking
- Optional AI-assisted call summaries and sentiment

## Tech Stack

Backend
- Node.js + TypeScript
- Express.js
- Prisma (MongoDB)
- JWT auth
- Swagger / OpenAPI

Frontend (web)
- Next.js 16 (React 19)
- Tailwind CSS 4
- Zustand, React Hook Form, Zod

## Repository Layout

- backend/ : API server, Prisma schema, scripts
- frontend/web/ : Next.js web app
- frontend/flutter/ : Flutter client (if used)
- docs/ : docs and references

## Quick Start (local)

Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)

Backend
```bash
cd backend
npm install

# Create .env from the example and fill in your values
# Copy backend/.env.example -> backend/.env

npm run db:generate
npm run db:push
npm run dev
```

Frontend (web)
```bash
cd frontend/web
npm install

# Create .env.local from the example and set API base URL
# Copy frontend/web/.env.local.example -> frontend/web/.env.local

npm run dev
```

The API runs on the port set in backend/.env (see PORT). The web app expects the API base URL in NEXT_PUBLIC_API_URL.

## Environment Variables

Backend (backend/.env)
- MONGO_URL
- JWT_SECRET
- REFRESH_SECRET
- PORT
- CORS_ORIGINS
- EMAIL_PROVIDER and provider-specific SMTP/SENDGRID settings
- SWAGGER_ENABLED
- AI_ENABLED, AI_PROVIDER, OPENAI_API_KEY, AI_FEATURES (optional)

Frontend (frontend/web/.env.local)
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_APP_NAME (optional)
- NEXT_PUBLIC_ENV (optional)

## Security Notes

- Keep real secrets out of Git; use the provided example env files as templates.
- Rotate API keys and tokens before publishing or deploying.

## Scripts

Backend
- npm run dev
- npm run build
- npm start
- npm run db:push
- npm run db:generate
- npm run db:studio

Frontend
- npm run dev
- npm run build
- npm run start
- npm run lint

## API Docs

When the backend is running, Swagger is available at:
- http://localhost:<PORT>/api/docs

## Deployment Notes

- Ensure all environment variables are set in your hosting environment.
- Run backend build and prisma generate as part of your deployment pipeline.
- Configure NEXT_PUBLIC_API_URL to point at the deployed API.

## License

MIT License. See LICENSE.
