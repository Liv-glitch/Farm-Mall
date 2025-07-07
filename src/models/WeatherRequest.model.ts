import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface WeatherRequest {
  id: string;
  userId: string;
  locationLat: number;
  locationLng: number;
  requestType: 'current' | 'forecast' | 'historical';
  responseData: any;
  createdAt: Date;
}

// Define creation attributes (optional id and timestamps)
interface WeatherRequestCreationAttributes extends Optional<WeatherRequest, 'id' | 'createdAt'> {}

export class WeatherRequestModel extends Model<WeatherRequest, WeatherRequestCreationAttributes> implements WeatherRequest {
  public id!: string;
  public userId!: string;
  public locationLat!: number;
  public locationLng!: number;
  public requestType!: 'current' | 'forecast' | 'historical';
  public responseData!: any;
  public readonly createdAt!: Date;

  // Model associations
  public static associate(models: any): void {
    WeatherRequestModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

// Initialize model
WeatherRequestModel.init(
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
    locationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      field: 'location_lat',
      validate: {
        min: -90,
        max: 90,
      },
    },
    locationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      field: 'location_lng',
      validate: {
        min: -180,
        max: 180,
      },
    },
    requestType: {
      type: DataTypes.ENUM('current', 'forecast', 'historical'),
      allowNull: false,
      field: 'request_type',
    },
    responseData: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'response_data',
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
    tableName: 'weather_requests',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        name: 'weather_requests_user_id_idx',
        fields: ['user_id'],
      },
      {
        name: 'weather_requests_created_at_idx',
        fields: ['created_at'],
      },
    ],
  }
); 