import { Sequelize } from 'sequelize';
import { UserModel, initializeUserModel } from './User.model';
import { ProductionCycleModel } from './ProductionCycle.model';
import { CropVarietyModel } from './CropVariety.model';
import { ActivityModel } from './Activity.model';
import { FarmCollaboratorModel } from './FarmCollaborator.model';
import { PestAnalysisModel } from './PestAnalysis.model';
import { WeatherRequestModel } from './WeatherRequest.model';
import { FarmModel } from './Farm.model';

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

// Set up model associations
function setupAssociations(): void {
  UserModel.associate({
    ProductionCycle: ProductionCycleModel,
    PestAnalysis: PestAnalysisModel,
    WeatherRequest: WeatherRequestModel,
    Farm: FarmModel,
  });

  ProductionCycleModel.associate({
    User: UserModel,
    CropVariety: CropVarietyModel,
    Activity: ActivityModel,
    PestAnalysis: PestAnalysisModel,
    Farm: FarmModel
  });

  CropVarietyModel.associate({
    ProductionCycle: ProductionCycleModel,
  });

  ActivityModel.associate({
    User: UserModel,
    ProductionCycle: ProductionCycleModel,
  });

  FarmCollaboratorModel.associate({
    User: UserModel,
    Farm: FarmModel,
  });

  PestAnalysisModel.associate({
    User: UserModel,
    ProductionCycle: ProductionCycleModel,
  });

  WeatherRequestModel.associate({
    User: UserModel,
  });

  FarmModel.associate({
    User: UserModel,
    ProductionCycle: ProductionCycleModel,
    FarmCollaborator: FarmCollaboratorModel,
  });
}

// Export models for use throughout the application
export {
  UserModel,
  ProductionCycleModel,
  CropVarietyModel,
  ActivityModel,
  FarmCollaboratorModel,
  PestAnalysisModel,
  WeatherRequestModel,
  FarmModel,
};

// Export types
export * from './User.model';
export * from './ProductionCycle.model';
export * from './CropVariety.model';
export * from './Activity.model';
