# FarmMall backend

FarmMall's backend is a TypeScript/Express REST API. It provides authentication, production-cycle tracking, farm preparation, calculators, AI-assisted crop analysis, reports, collaboration, events, media uploads, and marketplace integrations for the Next.js frontend.

The API uses MySQL/MariaDB through Sequelize. Redis and all third-party services are optional in development; features that depend on them may be unavailable or run synchronously when they are not configured.

## Features currently available

| Area | What is implemented |
| --- | --- |
| Authentication | Registration, login, JWT access/refresh tokens, logout, email OTP verification, password reset, profile updates, password changes, and role checks |
| Production | Crop varieties, farms, production cycles, activities, harvest details, dashboard statistics, and saved activity/financial cycle reports |
| Farm preparation | Pre-production plans, guided preparation steps, task completion, costs, suppliers, and service links |
| Calculators and reports | Cost estimates, harvest predictions, input prices, yield analysis, and printable farm decision reports |
| Crop intelligence | Image upload or URL-based pest/disease analysis, plant identification, plant-health assessment, soil-test analysis, and optional Gemini, Plant.id, OpenAI, or Hugging Face providers |
| Collaboration | Farm invitations, collaborators, roles, permissions, invitation acceptance, and access management |
| Media | Supabase-backed uploads, associations, image variants, profile/crop/livestock/soil upload flows, and media analytics |
| Markets | Buyers marketplace registration, booking decisions and callbacks; inputs marketplace listings and short-lived SSO codes |
| Events and administration | Public events; admin-only event CRUD, user listing, aggregate dashboard statistics, and system health |
| Platform | Swagger/OpenAPI documentation, CORS allow-listing, rate limiting, structured logging, health checks, and optional Redis-backed processing |

Most application endpoints are mounted at `/api/v1`. Swagger is served at `/api-docs`, and the basic process health check is at `/health`.

## Technology

- Node.js 18+ (Node.js 20 LTS recommended)
- TypeScript, Express, and Sequelize
- MySQL or MariaDB
- Redis and BullMQ (optional)
- Supabase Storage (optional, required for persisted uploads)
- Jest and Supertest

## Run locally

### 1. Install prerequisites

Install Node.js 18 or newer, npm, and MySQL/MariaDB. Redis is not required for local development unless you want to test queued processing.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

```bash
cp .env.example .env
```

For a minimal local setup, update these values in `.env`:

```env
NODE_ENV=development
PORT=3000
API_VERSION=v1
API_PUBLIC_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=farmmall
DB_USER=farmmall
DB_PASSWORD=change_me
DB_SSL=false

JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret
CORS_ORIGINS=http://localhost:3001

ENABLE_REDIS=false
ENABLE_UPLOADS=false
FRONTEND_URL=http://localhost:3001
```

The defaults let the API boot without Redis, uploads, or AI providers. The related features require the service-specific variables documented in [`.env.example`](.env.example).

### 4. Create and initialize the database

Create an empty MySQL database and grant your configured user access to it. For example:

```sql
CREATE DATABASE farmmall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The active MySQL schema is managed by raw SQL in `migrations/`, not by the legacy Sequelize migrations. Import:

1. `migrations/schema.sql`
2. `migrations/seed.sql`
3. The numbered migrations from `0002` through `0015`, in filename order

`0009-seed-demo-cycle-reports-alakara.sql` is optional demo data. See [`migrations/README.md`](migrations/README.md) for phpMyAdmin instructions and migration conventions.

With the MySQL command-line client, an import looks like:

```bash
mysql -u farmmall -p farmmall < migrations/schema.sql
mysql -u farmmall -p farmmall < migrations/seed.sql
mysql -u farmmall -p farmmall < migrations/0003-add-production-cycle-location-fields.sql
```

Repeat the last command for each remaining numbered migration in order. The seed file contains a temporary admin account; change its password immediately, edit the seed before import, or create an admin from the configured `ADMIN_*` values after the schema is ready:

```bash
npm run admin:bootstrap
```

> `npm run migrate` points at archived PostgreSQL-era Sequelize migrations and is not the setup path for the current MySQL schema.

### 5. Start the API

```bash
npm run dev
```

Verify the service:

```bash
curl http://localhost:3000/health
```

Then open `http://localhost:3000/api-docs` for the interactive API documentation. Run the frontend on port `3001` so it does not conflict with the API.

## Environment variables

The deployment-oriented example is in [`.env.example`](.env.example), and `src/config/environment.ts` defines every supported setting. The most important groups are:

| Group | Variables | Notes |
| --- | --- | --- |
| App/API | `NODE_ENV`, `PORT`, `API_VERSION`, `API_PUBLIC_URL`, `API_BASE_PATH`, `CORS_ORIGINS` | `API_BASE_PATH` is mainly for a path-mounted deployment |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DATABASE_URL` | Discrete `DB_*` values are the normal MySQL setup |
| Authentication | `JWT_SECRET`, `JWT_REFRESH_SECRET`, token expiry values, `BCRYPT_SALT_ROUNDS` | Use unique production secrets |
| Uploads | `ENABLE_UPLOADS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Disable uploads if storage is not configured |
| AI/diagnosis | `GEMINI_API_KEY`, `PLANTID_API_KEY`, `OPENAI_API_KEY`, and the `HF_*` variables | Optional; diagnosis capability depends on the configured provider |
| Weather | `OPENWEATHER_API_KEY` or `WEATHER_API_KEY` | The frontend also has its own server-side current-weather route |
| Marketplaces | `MARKETPLACE_MAIN_*`, `MARKETPLACE_CALLBACK_TOKEN`, and `INPUTS_MARKETPLACE_*` | Required for external marketplace flows |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `FRONTEND_URL` | Used for signup OTP and password-reset messages |
| Queues | `ENABLE_REDIS`, `REDIS_URL` or individual `REDIS_*` values | With Redis off, supported jobs run in the request process |

Production startup validates additional variables. Review both `.env.example` and `src/config/environment.ts` before deploying.

## Useful commands

```bash
npm run dev             # development server with reload
npm run build           # compile TypeScript into dist/
npm start               # run the compiled server
npm test                # Jest test suite
npm run test:unit       # unit tests
npm run test:integration
npm run test:coverage
npm run lint
npm run admin:bootstrap # create or update the configured admin account
```

## Main API groups

| Prefix | Purpose |
| --- | --- |
| `/api/v1/auth` | Accounts, tokens, verification, password reset, and profiles |
| `/api/v1/production` | Crop varieties, cycles, activities, dashboard data, and cycle reports |
| `/api/v1/preproduction` | Farm preparation plans and tasks |
| `/api/v1/calculator` | Cost, harvest, variety, and input-price calculations |
| `/api/v1/ai`, `/api/v1/enhanced-plant`, `/api/v1/soil-analysis` | Diagnosis and farm-intelligence workflows |
| `/api/v1/collaboration` | Invitations, collaborators, roles, and permissions |
| `/api/v1/media` | Uploads, image variants, associations, and media analytics |
| `/api/v1/events`, `/api/v1/admin` | Public events and protected administration |
| `/api/v1/buyers`, `/api/v1/sso` | Buyers and inputs marketplace integrations |
| `/api/v1/decision-reports` | Deterministic farm decision report generation |

Consult Swagger for request and response details. Protected routes expect `Authorization: Bearer <access-token>`.

## What needs improvement

These are ordered by product priority and include unfinished behavior found in the current code.

1. **Integrate the satellite monitoring system with FarmMall.** Connect the existing satellite service to farm boundaries and production cycles; store field observations; expose vegetation/health, moisture, weather, and change-over-time data through authenticated endpoints; add alert rules; and define refresh, retry, and provider-failure behavior. No satellite data model, synchronization job, or API route currently exists in this backend.
2. **Build a complete admin dashboard.** The API currently exposes basic stats, users, system health, and event management, but it needs proper admin services for user search and status/role changes, subscriptions, farms and cycles, content, marketplace operations, AI/service usage, audit logs, security controls, platform configuration, and operational analytics.
3. **Persist complete diagnosis history and statistics.** Pest-analysis history and aggregation paths still return empty placeholder results in part of the service layer. Consolidate the overlapping AI/Plant.id routes and make provider provenance and fallback results consistent.
4. **Finish notifications.** General WhatsApp, SMS, and push delivery are mocked. Implement production providers, delivery status, retry handling, templates, preferences, and observability. Align the older notification email configuration with the Resend/SMTP settings used elsewhere.
5. **Increase automated coverage.** Add end-to-end tests for authentication/OTP, uploads, AI-provider failures, admin authorization, marketplaces, reports, and migration compatibility; run them in CI against MySQL.

## Deployment

The repository-level `DEPLOYMENT.md` contains the current cPanel/Namecheap deployment procedure, including path-mounted API configuration. Never commit `.env`, service-role keys, access tokens, generated logs, or uploaded user content.
