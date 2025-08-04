import { Model, DataTypes } from 'sequelize';

export class PlantIdentificationModel extends Model {
  public id!: string;
  public userId!: string;
  public imageUrl!: string;
  public thumbnailUrl?: string;
  public originalFilename?: string;
  public latitude?: number;
  public longitude?: number;
  public identificationResult!: any;
  public confidenceScore?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association method
  public static associate: (models: any) => void;
}

// Initialize the model with proper schema
export function initializePlantIdentificationModel(sequelize: any): void {
  PlantIdentificationModel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users', // Use table name instead of model reference
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      field: 'user_id'
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'image_url'
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'thumbnail_url'
    },
    originalFilename: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'original_filename'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    identificationResult: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'identification_result'
    },
    confidenceScore: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      field: 'confidence_score'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'plant_identifications',
    underscored: true
  });
}

// Define associations method
PlantIdentificationModel.associate = (models: any) => {
  PlantIdentificationModel.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
}; 