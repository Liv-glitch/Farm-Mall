import { Model, DataTypes, Sequelize } from 'sequelize';
import { PreproductionPlanModel } from './PreproductionPlan.model';

interface PreproductionStepAttributes {
  id: string;
  planId: string;
  order: number;
  title: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PreproductionStepCreationAttributes
  extends Omit<PreproductionStepAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class PreproductionStepModel
  extends Model<PreproductionStepAttributes, PreproductionStepCreationAttributes>
  implements PreproductionStepAttributes
{
  public id!: string;
  public planId!: string;
  public order!: number;
  public title!: string;
  public dateRangeStart!: string | null;
  public dateRangeEnd!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any): void {
    PreproductionStepModel.belongsTo(models.PreproductionPlan, {
      foreignKey: 'planId',
      as: 'plan',
    });

    PreproductionStepModel.hasMany(models.PreproductionTask, {
      foreignKey: 'stepId',
      as: 'tasks',
    });
  }
}

export function initializePreproductionStepModel(sequelize: Sequelize): void {
  PreproductionStepModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      planId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'plan_id',
        references: {
          model: PreproductionPlanModel,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      dateRangeStart: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'date_range_start',
      },
      dateRangeEnd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'date_range_end',
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
      tableName: 'preproduction_steps',
      underscored: true,
    }
  );
}
