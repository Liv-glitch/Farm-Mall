import { Model, DataTypes, Sequelize } from 'sequelize';
import { UserModel } from './User.model';
import { FarmModel } from './Farm.model';

interface SoilTestAttributes {
  id: string;
  userId: string;
  farmId?: string;
  documentUrl: string;
  thumbnailUrl?: string;
  originalFilename: string;
  analysisResult?: {
    ph?: number;
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    organicMatter?: number;
    texture?: string;
    recommendations?: Array<{
      type: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    suitableCrops?: Array<{
      cropType: string;
      suitabilityScore: number;
      notes?: string;
    }>;
  };
  status: 'pending' | 'analyzed' | 'failed';
  aiModelVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SoilTestCreationAttributes extends Omit<SoilTestAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class SoilTestModel extends Model<SoilTestAttributes, SoilTestCreationAttributes> implements SoilTestAttributes {
  public id!: string;
  public userId!: string;
  public farmId?: string;
  public documentUrl!: string;
  public thumbnailUrl?: string;
  public originalFilename!: string;
  public analysisResult?: {
    ph?: number;
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    organicMatter?: number;
    texture?: string;
    recommendations?: Array<{
      type: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    suitableCrops?: Array<{
      cropType: string;
      suitabilityScore: number;
      notes?: string;
    }>;
  };
  public status!: 'pending' | 'analyzed' | 'failed';
  public aiModelVersion?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Model associations
  public static associate(models: any): void {
    SoilTestModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    SoilTestModel.belongsTo(models.Farm, {
      foreignKey: 'farmId',
      as: 'farm',
    });
  }
}

export function initializeSoilTestModel(sequelize: Sequelize): void {
  SoilTestModel.init(
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
          model: UserModel,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farmId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'farm_id',
        references: {
          model: FarmModel,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      documentUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'document_url',
        validate: {
          isUrl: true,
        },
      },
      thumbnailUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'thumbnail_url',
        validate: {
          isUrl: true,
        },
      },
      originalFilename: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'original_filename',
      },
      analysisResult: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'analysis_result',
      },
      status: {
        type: DataTypes.ENUM('pending', 'analyzed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      aiModelVersion: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'ai_model_version',
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
      tableName: 'soil_tests',
      underscored: true,
    }
  );
} 