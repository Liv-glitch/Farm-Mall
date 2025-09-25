import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { CropVariety as CropVarietyInterface } from '../types/production.types';

// Define creation attributes (optional id and timestamps)
interface CropVarietyCreationAttributes extends Optional<CropVarietyInterface, 'id' | 'createdAt'> {}

export class CropVarietyModel extends Model<CropVarietyInterface, CropVarietyCreationAttributes> implements CropVarietyInterface {
  public id!: string;
  public name!: string;
  public cropType!: string;
  public maturityPeriodDays!: number;
  public seedSize1BagsPerAcre!: number;
  public seedSize2BagsPerAcre!: number;
  public seedSize1CostPerAcre!: number;
  public seedSize2CostPerAcre!: number;
  public fertilizerCostPerAcre!: number;
  public herbicideCostPerAcre!: number;
  public fungicideCostPerAcre!: number;
  public insecticideCostPerAcre!: number;
  public laborCostPerAcre!: number;
  public landPreparationCostPerAcre!: number;
  public miscellaneousCostPerAcre!: number;
  public averageYieldPerAcre!: number;
  public costDataUpdatedAt!: Date;
  public readonly createdAt!: Date;

  // Model associations
  public static associate(models: any): void {
    CropVarietyModel.hasMany(models.ProductionCycle, {
      foreignKey: 'cropVarietyId',
      as: 'productionCycles',
    });
  }

  // Instance methods
  public getSeedRequirement(landSizeAcres: number, seedSize: 1 | 2): { bags: number; totalCost: number } {
    const bagsPerAcre = seedSize === 1 ? this.seedSize1BagsPerAcre : this.seedSize2BagsPerAcre;
    const costPerAcre = seedSize === 1 ? this.seedSize1CostPerAcre : this.seedSize2CostPerAcre;
    const totalBags = Math.ceil(landSizeAcres * bagsPerAcre);
    const totalCost = costPerAcre * landSizeAcres;

    return {
      bags: totalBags,
      totalCost,
    };
  }

  public getTotalCostPerAcre(): number {
    return (
      this.fertilizerCostPerAcre +
      this.herbicideCostPerAcre +
      this.fungicideCostPerAcre +
      this.insecticideCostPerAcre +
      this.laborCostPerAcre +
      this.landPreparationCostPerAcre +
      this.miscellaneousCostPerAcre
    );
  }

  public getTotalProductionCost(landSizeAcres: number, seedSize: 1 | 2): number {
    const seedCost = this.getSeedRequirement(landSizeAcres, seedSize).totalCost;
    const otherCostsPerAcre = this.getTotalCostPerAcre();
    return seedCost + (otherCostsPerAcre * landSizeAcres);
  }

  public getHarvestDate(plantingDate: Date): Date {
    const harvestDate = new Date(plantingDate);
    harvestDate.setDate(harvestDate.getDate() + this.maturityPeriodDays);
    return harvestDate;
  }

  public isEarlyMaturity(): boolean {
    return this.maturityPeriodDays <= 90;
  }

  public isMediumMaturity(): boolean {
    return this.maturityPeriodDays > 90 && this.maturityPeriodDays <= 120;
  }

  public isLateMaturity(): boolean {
    return this.maturityPeriodDays > 120;
  }
}

CropVarietyModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    cropType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'crop_type',
      validate: {
        notEmpty: true,
        isIn: [['potato', 'maize', 'beans', 'tomato', 'onion', 'cabbage', 'carrot', 'spinach', 'kale', 'lettuce', 'pepper', 'cucumber', 'squash']], // Extensible for other crops
      },
    },
    maturityPeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'maturity_period_days',
      validate: {
        min: 30,
        max: 365,
        isInt: true,
      },
    },
    seedSize1BagsPerAcre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'seed_size_1_bags_per_acre',
      validate: {
        min: 1,
        max: 50,
        isInt: true,
      },
    },
    seedSize2BagsPerAcre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'seed_size_2_bags_per_acre',
      validate: {
        min: 1,
        max: 50,
        isInt: true,
      },
    },
    seedSize1CostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'seed_size_1_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    seedSize2CostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'seed_size_2_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    fertilizerCostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'fertilizer_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    herbicideCostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'herbicide_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    fungicideCostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'fungicide_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    insecticideCostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'insecticide_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    laborCostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'labor_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    landPreparationCostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'land_preparation_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    miscellaneousCostPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'miscellaneous_cost_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    averageYieldPerAcre: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'average_yield_per_acre',
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    costDataUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cost_data_updated_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'crop_varieties',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        name: 'crop_varieties_name_idx',
        unique: true,
        fields: ['name'],
      },
      {
        name: 'crop_varieties_type_idx',
        fields: ['crop_type'],
      },
      {
        name: 'crop_varieties_maturity_idx',
        fields: ['maturity_period_days'],
      },
    ],
  }
);

export default CropVarietyModel; 