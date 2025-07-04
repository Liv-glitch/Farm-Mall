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
  public seedCostPerBag!: number;
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
    const totalBags = Math.ceil(landSizeAcres * bagsPerAcre);
    const totalCost = totalBags * this.seedCostPerBag;
    
    return {
      bags: totalBags,
      totalCost,
    };
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
    seedCostPerBag: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'seed_cost_per_bag',
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