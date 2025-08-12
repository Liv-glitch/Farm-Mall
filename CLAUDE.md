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
- **PostgreSQL**: Primary database with Sequelize ORM
- **Redis**: Caching and session management (optional, gracefully degrades)
- **BullMQ**: Queue processing for media and background tasks

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

Required environment variables (see README.md for complete list):
- Database: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Redis: `REDIS_HOST`, `REDIS_PORT` (optional)
- AI APIs: `PLANT_ID_API_KEY`, `OPENAI_API_KEY`
- Storage: Supabase credentials for file storage

## Database Migrations

The project uses Sequelize migrations located in `src/migrations/`. Always run migrations before starting development:
```bash
npm run migrate
```

Migration files are numbered sequentially and handle schema evolution including tables for users, farms, production cycles, pest analyses, soil tests, media, and collaboration features.

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