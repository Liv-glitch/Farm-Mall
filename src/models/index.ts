import { Sequelize } from 'sequelize';
import { UserModel, initializeUserModel } from './User.model';
import { ProductionCycleModel } from './ProductionCycle.model';
import { CropVarietyModel } from './CropVariety.model';
import { ActivityModel } from './Activity.model';

// Initialize all models with the sequelize instance
export function initializeModels(sequelize: Sequelize): void {
  // Initialize User model
  initializeUserModel(sequelize);
  
  // Other models are already initialized in their respective files
  // through their .init() calls at the bottom
  
  // Set up model associations after all models are initialized
  setupAssociations();
  
  console.log('📋 All database models initialized with associations successfully.');
}

// Set up all model associations
function setupAssociations(): void {
  // User associations
  UserModel.hasMany(ProductionCycleModel, {
    foreignKey: 'userId',
    as: 'productionCycles',
  });

  UserModel.hasMany(ActivityModel, {
    foreignKey: 'userId', 
    as: 'activities',
  });

  // ProductionCycle associations
  ProductionCycleModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
  });

  ProductionCycleModel.belongsTo(CropVarietyModel, {
    foreignKey: 'cropVarietyId',
    as: 'cropVariety',
  });

  ProductionCycleModel.hasMany(ActivityModel, {
    foreignKey: 'productionCycleId',
    as: 'activities',
  });

  // CropVariety associations
  CropVarietyModel.hasMany(ProductionCycleModel, {
    foreignKey: 'cropVarietyId',
    as: 'productionCycles',
  });

  // Activity associations
  ActivityModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
  });

  ActivityModel.belongsTo(ProductionCycleModel, {
    foreignKey: 'productionCycleId',
    as: 'productionCycle',
  });

  console.log('🔗 Model associations configured successfully.');
}

// Export models for use throughout the application
export {
  UserModel,
  ProductionCycleModel,
  CropVarietyModel,
  ActivityModel,
};

// Export types
export * from './User.model';
export * from './ProductionCycle.model';
export * from './CropVariety.model';
export * from './Activity.model';
