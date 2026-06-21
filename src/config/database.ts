import { Sequelize, Options } from 'sequelize';
import { env } from './environment';

const databaseConfig: Options = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  dialect: 'mysql',
  dialectOptions: {
    // cPanel MySQL runs on localhost without TLS. Only enable SSL when explicitly
    // connecting to a remote DB that requires it (DB_SSL=true).
    ...(env.DB_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  timezone: '+03:00', // EAT timezone for Kenya
};

// Create Sequelize instance.
// Prefer discrete DB_* credentials (cPanel MySQL); DATABASE_URL is an optional override.
export const sequelize = env.DATABASE_URL
  ? new Sequelize(env.DATABASE_URL, databaseConfig)
  : new Sequelize(databaseConfig);

// Test database connection
export const connectDatabase = async (): Promise<void> => {
  // Add timeout to database connection
  const authenticatePromise = sequelize.authenticate();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Database connection timeout after 10s')), 10000);
  });

  await Promise.race([authenticatePromise, timeoutPromise]);
  console.log('✅ Database connection established successfully.');
  
  // Initialize all models after connection is established
  const { initializeModels } = await import('../models');
  initializeModels(sequelize);
  
  // Note: Schema creation now handled by migrations
  // Run 'npm run migrate' to create/update database schema
  console.log('💡 Use "npm run migrate" to run database migrations');
};

// Close database connection
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

export default sequelize; 