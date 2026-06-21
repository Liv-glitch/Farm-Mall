import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Event, EventMode } from '../types/event.types';

interface EventCreationAttributes extends Optional<Event, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {}

export class EventModel extends Model<Event, EventCreationAttributes> implements Event {
  public id!: string;
  public name!: string;
  public date!: Date;
  public mode!: EventMode;
  public location?: string | null;
  public registrationLink!: string;
  public description!: string;
  public createdBy?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any): void {
    EventModel.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
  }
}

EventModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    mode: {
      type: DataTypes.ENUM('online', 'physical'),
      allowNull: false,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    registrationLink: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'registration_link',
      validate: {
        isUrl: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
    tableName: 'events',
    underscored: true,
    timestamps: true,
  }
);

export default EventModel;
