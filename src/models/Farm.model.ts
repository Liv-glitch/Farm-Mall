import { DataTypes, Model, Optional, HasManyGetAssociationsMixin } from 'sequelize';
import { sequelize } from '../config/database';
import { FarmCollaboratorModel } from './FarmCollaborator.model';

interface FarmAttributes {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  sizeAcres?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FarmCreationAttributes extends Optional<FarmAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class FarmModel extends Model<FarmAttributes, FarmCreationAttributes> implements FarmAttributes {
  public id!: string;
  public ownerId!: string;
  public name!: string;
  public description?: string;
  public location?: string;
  public locationLat?: number;
  public locationLng?: number;
  public sizeAcres?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Virtual attributes
  public readonly owner?: any;
  public readonly collaborators?: FarmCollaboratorModel[];
  public readonly productionCycles?: any[];

  // Association mixins
  public getCollaborators!: HasManyGetAssociationsMixin<FarmCollaboratorModel>;

  // Model associations
  public static associate(models: any): void {
    FarmModel.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
    });

    FarmModel.hasMany(models.FarmCollaborator, {
      foreignKey: 'farmId',
      as: 'collaborators',
    });

    FarmModel.hasMany(models.ProductionCycle, {
      foreignKey: 'farmId',
      as: 'productionCycles',
    });
  }
}

FarmModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'owner_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    locationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'location_lat',
      validate: {
        min: -90,
        max: 90
      }
    },
    locationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'location_lng',
      validate: {
        min: -180,
        max: 180
      }
    },
    sizeAcres: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: 'size_acres',
      validate: {
        min: 0
      }
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
  },
  {
    sequelize,
    tableName: 'farms',
    underscored: true
  }
);

export default FarmModel; 