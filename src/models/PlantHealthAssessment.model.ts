import { Model, DataTypes } from 'sequelize';

export class PlantHealthAssessmentModel extends Model {
  public id!: string;
  public userId!: string;
  public imageUrl!: string;
  public thumbnailUrl?: string;
  public originalFilename?: string;
  public latitude?: number;
  public longitude?: number;
  public healthAssessmentResult!: any;
  public isHealthy?: boolean;
  public diseases?: any;
  public treatmentSuggestions?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association method
  public static associate: (models: any) => void;
}

// Initialize the model with proper schema
export function initializePlantHealthAssessmentModel(sequelize: any): void {
  PlantHealthAssessmentModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
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
  healthAssessmentResult: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'health_assessment_result'
  },
  isHealthy: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'is_healthy'
  },
  diseases: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  treatmentSuggestions: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'treatment_suggestions'
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
    tableName: 'plant_health_assessments',
    underscored: true
  });
}

// Define associations method
PlantHealthAssessmentModel.associate = (models: any) => {
  PlantHealthAssessmentModel.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
}; 