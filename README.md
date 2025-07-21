# FarmMall API

A comprehensive agriculture management system for Kenya potato farming.

## Features

- Cost calculation and harvest prediction
- AI-powered pest and disease analysis
- Weather integration and forecasting
- Production cycle management
- WhatsApp integration
- Premium subscription features
- Farm collaboration and team management
- Soil test analysis and recommendations

## Environment Variables

```env
# App
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmmall
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# Plant.id API
PLANT_ID_API_KEY=your-plantid-api-key

# Weather API
WEATHER_API_KEY=your-weather-api-key

# WhatsApp API
WHATSAPP_API_KEY=your-whatsapp-api-key

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_STORAGE_BUCKET=farm-documents

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`
4. Set up the database:
   ```bash
   npm run db:setup
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "Auth"

# Run tests with coverage
npm run test:coverage
```

## License

MIT 