import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ProductionCycle as ProductionCycleInterface } from '../types/production.types';

// Define creation attributes (optional id and timestamps)
interface ProductionCycleCreationAttributes extends Optional<ProductionCycleInterface, 'id' | 'createdAt' | 'updatedAt'> {}

export class ProductionCycleModel extends Model<ProductionCycleInterface, ProductionCycleCreationAttributes> implements ProductionCycleInterface {
  public id!: string;
  public userId!: string;
  public cropVarietyId!: string;
  public landSizeAcres!: number;
  public farmLocation?: string;
  public farmLocationLat?: number;
  public farmLocationLng?: number;
  public plantingDate?: Date;
  public estimatedHarvestDate?: Date;
  public actualHarvestDate?: Date;
  public status!: 'planning' | 'active' | 'harvested' | 'archived';
  public totalCost!: number;
  public totalYieldKg?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Virtual attributes
  public readonly cropVariety?: any;
  public readonly activities?: any[];

  // Model associations
  public static associate(models: any): void {
    ProductionCycleModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    ProductionCycleModel.belongsTo(models.CropVariety, {
      foreignKey: 'cropVarietyId',
      as: 'cropVariety',
    });

    ProductionCycleModel.hasMany(models.Activity, {
      foreignKey: 'productionCycleId',
      as: 'activities',
    });

    ProductionCycleModel.hasMany(models.PestAnalysis, {
      foreignKey: 'productionCycleId',
      as: 'pestAnalyses',
    });
  }

  // Instance methods
  public isActive(): boolean {
    return this.status === 'active';
  }

  public isCompleted(): boolean {
    return this.status === 'harvested';
  }

  public getDaysToHarvest(): number | null {
    if (!this.estimatedHarvestDate) return null;
    const today = new Date();
    const harvestDate = new Date(this.estimatedHarvestDate);
    const diffTime = harvestDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getDaysFromPlanting(): number | null {
    if (!this.plantingDate) return null;
    const today = new Date();
    const plantingDate = new Date(this.plantingDate);
    const diffTime = today.getTime() - plantingDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  public getYieldPerAcre(): number | null {
    if (!this.totalYieldKg) return null;
    return this.totalYieldKg / this.landSizeAcres;
  }

  public getCostPerAcre(): number {
    return this.totalCost / this.landSizeAcres;
  }

  public getProfitability(): { profit: number; profitMargin: number } | null {
    if (!this.totalYieldKg) return null;
    
    // Estimated revenue based on average potato price (KES 30 per kg)
    const estimatedRevenue = this.totalYieldKg * 30;
    const profit = estimatedRevenue - this.totalCost;
    const profitMargin = (profit / estimatedRevenue) * 100;
    
    return { profit, profitMargin };
  }

  public updateStatus(): void {
    const today = new Date();
    
    if (this.plantingDate && this.status === 'planning') {
      if (today >= this.plantingDate) {
        this.status = 'active';
      }
    }
    
    if (this.actualHarvestDate && this.status === 'active') {
      this.status = 'harvested';
    }
  }
}

ProductionCycleModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    cropVarietyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'crop_variety_id',
      references: {
        model: 'crop_varieties',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    landSizeAcres: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: 'land_size_acres',
      validate: {
        min: 0.1,
        max: 10000,
        isDecimal: true,
      },
    },
    farmLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'farm_location',
    },
    farmLocationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'farm_location_lat',
      validate: {
        min: -90,
        max: 90,
      },
    },
    farmLocationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'farm_location_lng',
      validate: {
        min: -180,
        max: 180,
      },
    },
    plantingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'planting_date',
    },
    estimatedHarvestDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'estimated_harvest_date',
    },
    actualHarvestDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'actual_harvest_date',
    },
    status: {
      type: DataTypes.ENUM('planning', 'active', 'harvested', 'archived'),
      allowNull: false,
      defaultValue: 'planning',
    },
    totalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_cost',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    totalYieldKg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'total_yield_kg',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'production_cycles',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        name: 'production_cycles_user_idx',
        fields: ['user_id'],
      },
      {
        name: 'production_cycles_variety_idx',
        fields: ['crop_variety_id'],
      },
      {
        name: 'production_cycles_status_idx',
        fields: ['status'],
      },
      {
        name: 'production_cycles_planting_date_idx',
        fields: ['planting_date'],
      },
      {
        name: 'production_cycles_harvest_date_idx',
        fields: ['estimated_harvest_date'],
      },
      {
        name: 'production_cycles_location_idx',
        fields: ['farm_location_lat', 'farm_location_lng'],
      },
    ],
    hooks: {
      beforeSave: async (instance: ProductionCycleModel) => {
        instance.updateStatus();
      },
    },
    validate: {
      harvestDateAfterPlanting() {
        if (this.plantingDate && this.estimatedHarvestDate) {
          if (this.estimatedHarvestDate <= this.plantingDate) {
            throw new Error('Estimated harvest date must be after planting date');
          }
        }
      },
      actualHarvestDateValid() {
        if (this.actualHarvestDate) {
          if (this.plantingDate && this.actualHarvestDate < this.plantingDate) {
            throw new Error('Actual harvest date cannot be before planting date');
          }
          if (this.actualHarvestDate > new Date()) {
            throw new Error('Actual harvest date cannot be in the future');
          }
        }
      },
    },
  }
);

export default ProductionCycleModel; 