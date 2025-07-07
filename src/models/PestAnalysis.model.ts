import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { PestAnalysisRecord } from '../types/ai.types';

// Define creation attributes (optional id and timestamps)
interface PestAnalysisCreationAttributes extends Optional<PestAnalysisRecord, 'id' | 'createdAt'> {}

export class PestAnalysisModel extends Model<PestAnalysisRecord, PestAnalysisCreationAttributes> implements PestAnalysisRecord {
  public id!: string;
  public userId!: string;
  public productionCycleId?: string;
  public imageUrl!: string;
  public cropType!: string;
  public locationLat?: number;
  public locationLng?: number;
  public analysisResult!: any;
  public confidenceScore!: number;
  public status!: 'processing' | 'completed' | 'failed';
  public aiModelVersion!: string;
  public processingTimeMs!: number;
  public readonly createdAt!: Date;

  // Model associations
  public static associate(models: any): void {
    PestAnalysisModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    PestAnalysisModel.belongsTo(models.ProductionCycle, {
      foreignKey: 'productionCycleId',
      as: 'productionCycle',
    });
  }
}

// Initialize model
PestAnalysisModel.init(
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
    productionCycleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'production_cycle_id',
      references: {
        model: 'production_cycles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'image_url',
      validate: {
        isUrl: true,
      },
    },
    cropType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'crop_type',
    },
    locationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'location_lat',
      validate: {
        min: -90,
        max: 90,
      },
    },
    locationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'location_lng',
      validate: {
        min: -180,
        max: 180,
      },
    },
    analysisResult: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'analysis_result',
    },
    confidenceScore: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      field: 'confidence_score',
      validate: {
        min: 0,
        max: 1,
      },
    },
    status: {
      type: DataTypes.ENUM('processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'processing',
    },
    aiModelVersion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'ai_model_version',
    },
    processingTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'processing_time_ms',
      validate: {
        min: 0,
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
    tableName: 'pest_analyses',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        name: 'pest_analyses_user_id_idx',
        fields: ['user_id'],
      },
      {
        name: 'pest_analyses_production_cycle_id_idx',
        fields: ['production_cycle_id'],
      },
      {
        name: 'pest_analyses_created_at_idx',
        fields: ['created_at'],
      },
    ],
  }
); 