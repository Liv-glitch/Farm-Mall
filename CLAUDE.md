# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FarmMall API is a comprehensive agriculture management system designed for Kenya potato farming. It provides AI-powered features for crop management, pest analysis, production planning, and farm collaboration.

## Development Commands

```bash
# Development
npm run dev                    # Start development server with nodemon
npm run build                  # Compile TypeScript to JavaScript
npm start                      # Start production server

# Testing
npm test                       # Run all tests
npm run test:unit             # Run unit tests only
npm run test:integration      # Run integration tests only
npm run test:auth             # Run authentication tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Run tests with coverage report

# Database
npm run migrate               # Run database migrations
npm run migrate:undo          # Undo last migration
npm run seed                  # Run database seeders
npm run seed:undo            # Undo all seeders

# Code Quality
npm run lint                  # Run ESLint
npm run lint:fix             # Fix ESLint issues automatically
```

## Architecture & Tech Stack

### Backend Framework
- **Node.js/Express**: RESTful API server with TypeScript
- **MySQL/MariaDB**: Primary database with Sequelize ORM (`mysql` dialect, discrete `DB_*` credentials). Deployed on Namecheap cPanel. The schema is managed as raw SQL files in the top-level `migrations/` folder (`schema.sql` is the baseline, imported via phpMyAdmin); the original Postgres Sequelize migrations are archived under `src/migrations/_postgres-legacy/`.
- **Redis**: Optional, OFF by default (`ENABLE_REDIS=false`). When disabled, queue-backed work (soil analysis, media variants) runs synchronously in-request. Queue constructors are only created when `ENABLE_REDIS=true`.
- **BullMQ**: Queue processing for media/background tasks — only active when Redis is enabled.

### AI Services Integration
The system integrates multiple AI services through a modular service architecture:
- **Google Gemini**: Plant identification, health assessment, soil analysis, yield prediction
- **Plant.id**: Plant identification and health assessment
- **OpenAI**: Fallback AI analysis

### Key Service Architecture

#### Gemini Services (`src/services/gemini/`)
- `base-gemini.service.ts`: Base service for Gemini API interactions
- `plant-identification.service.ts`: Plant species identification
- `plant-health.service.ts`: Disease and pest detection
- `soil-analysis.service.ts`: Soil test interpretation
- `smart-yield-calculator.service.ts`: AI-powered yield predictions
- `integrated-analysis.service.ts`: Combined analysis workflows

### API Structure
- **Routes**: Feature-based routing in `src/routes/`
- **Controllers**: Business logic handlers in `src/controllers/`
- **Services**: Core business services and external API integrations
- **Models**: Sequelize models with associations in `src/models/`
- **Middleware**: Authentication, validation, rate limiting, error handling

### Database Models
Key entities include User, Farm, ProductionCycle, CropVariety, Activity, PestAnalysis, SoilTest, Media, and collaboration models. All models use Sequelize with proper associations defined in `src/models/index.ts`.

### Media Management
Enterprise media system with:
- Multi-variant image processing (thumbnail, medium, large)
- EXIF data extraction and analysis
- AI-powered image analysis integration
- S3/Supabase storage backends

### Authentication & Authorization
- JWT-based authentication with role-based access control
- User roles: farmer, admin, collaborator
- Farm-based collaboration with invitation system

## Environment Setup

Required environment variables (see `.env.example` for the complete annotated list):
- Database (required in prod): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (+ optional `DB_SSL` for remote TLS DBs)
- Auth (always required): `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Public URL / CORS: `API_PUBLIC_URL`, `CORS_ORIGINS` (comma-separated)
- Redis: `ENABLE_REDIS` (default false); `REDIS_*` only when enabled
- Storage: `ENABLE_UPLOADS` (default true) + `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` when uploads enabled
- AI APIs (optional): `GEMINI_API_KEY`, `PLANTID_API_KEY`, `OPENAI_API_KEY`

## Database Schema & Migrations

The schema is managed as raw **`.sql` files** in the top-level `migrations/` folder, imported via cPanel **phpMyAdmin** (no migration runner on shared hosting):
- `migrations/schema.sql` — baseline; builds the full schema on a fresh DB.
- Subsequent changes go in new numbered files (`0002-….sql`, …), imported in order. See `migrations/README.md`.

For local development against MySQL, import `migrations/schema.sql` into your local database the same way (e.g. `mysql <db> < migrations/schema.sql`). Seed data still uses Sequelize seeders (`npm run seed`). The legacy Sequelize migration runner (`npm run migrate`) is retained only for the archived Postgres history under `src/migrations/_postgres-legacy/` and is **not** used to build the MySQL schema.

## Testing Strategy

- **Unit Tests**: Service layer testing in `tests/unit/`
- **Integration Tests**: API endpoint testing in `tests/integration/`
- **Coverage Target**: 80% across branches, functions, lines, statements
- **Test Environment**: Uses separate test database and mocked external services

## Rate Limiting & Security

- Global rate limiting with express-rate-limit
- Helmet security headers
- CORS configuration for production/development environments
- Input validation with express-validator and Joi

## Error Handling

Centralized error handling through `src/middleware/error.middleware.ts` with structured error responses and comprehensive logging via Winston.

## Background Processing

Uses BullMQ queues for:
- Media processing and variant generation
- AI analysis workflows
- Notification dispatch