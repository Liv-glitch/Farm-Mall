import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Activity } from '../types/production.types';

// Define creation attributes (optional id and timestamps)
interface ActivityCreationAttributes extends Optional<Activity, 'id' | 'createdAt' | 'updatedAt' | 'userId'> {}

export class ActivityModel extends Model<Activity, ActivityCreationAttributes> implements Activity {
  public id!: string;
  public userId?: string;
  public productionCycleId!: string;
  public type!: string;
  public description?: string;
  public scheduledDate!: Date;
  public completedDate?: Date;
  public cost?: number;
  public laborHours?: number;
  public laborType?: 'hired' | 'family' | 'cooperative';
  public inputs?: Array<{
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }>;
  public notes?: string;
  public weather?: {
    temperature: number;
    humidity: number;
    conditions: string;
  };
  public status!: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define associations
  public static associate(models: any): void {
    ActivityModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    ActivityModel.belongsTo(models.ProductionCycle, {
      foreignKey: 'productionCycleId',
      as: 'productionCycle'
    });
  }

  // Instance methods
  public isCompleted(): boolean {
    return this.status === 'completed' && !!this.completedDate;
  }

  public isOverdue(): boolean {
    if (this.status === 'completed') return false;
    return new Date() > this.scheduledDate;
  }

  public getDaysUntilScheduled(): number {
    const now = new Date();
    const scheduled = new Date(this.scheduledDate);
    const diffTime = scheduled.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getTotalCost(): number {
    let total = this.cost || 0;
    if (this.inputs) {
      total += this.inputs.reduce((sum, input) => sum + input.cost, 0);
    }
    return total;
  }

  public markCompleted(completedDate?: Date): void {
    this.status = 'completed';
    this.completedDate = completedDate || new Date();
  }
}

// Initialize the model
ActivityModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    productionCycleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'production_cycles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['planting', 'fertilizing', 'weeding', 'pest_control', 'irrigation', 'harvesting', 'soil_preparation', 'other']],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    scheduledDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    laborHours: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
    },
    laborType: {
      type: DataTypes.ENUM('hired', 'family', 'cooperative'),
      allowNull: true,
    },
    inputs: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    weather: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'planned',
    },
  },
  {
    sequelize,
    modelName: 'Activity',
    tableName: 'activities',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['productionCycleId'],
      },
      {
        fields: ['scheduledDate'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['type'],
      },
    ],
  }
);

export default ActivityModel; 