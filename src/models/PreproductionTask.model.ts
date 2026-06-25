import { Model, DataTypes, Sequelize } from 'sequelize';
import { PreproductionStepModel } from './PreproductionStep.model';

interface PreproductionTaskAttributes {
  id: string;
  stepId: string;
  order: number;
  title: string;
  activityType: 'informational' | 'task';
  importance: string;
  recommendations: string[] | null;
  serviceLinks: { label: string; href: string }[] | null;
  whatYouNeed: string | null;
  whatYouNeedLink: string | null;
  expertTip: string | null;
  completed: boolean;
  dateCompleted: string | null;
  cost: number | null;
  supplier: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PreproductionTaskCreationAttributes
  extends Omit<PreproductionTaskAttributes, 'id' | 'completed' | 'createdAt' | 'updatedAt'> {
  completed?: boolean;
}

export class PreproductionTaskModel
  extends Model<PreproductionTaskAttributes, PreproductionTaskCreationAttributes>
  implements PreproductionTaskAttributes
{
  public id!: string;
  public stepId!: string;
  public order!: number;
  public title!: string;
  public activityType!: 'informational' | 'task';
  public importance!: string;
  public recommendations!: string[] | null;
  public serviceLinks!: { label: string; href: string }[] | null;
  public whatYouNeed!: string | null;
  public whatYouNeedLink!: string | null;
  public expertTip!: string | null;
  public completed!: boolean;
  public dateCompleted!: string | null;
  public cost!: number | null;
  public supplier!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any): void {
    PreproductionTaskModel.belongsTo(models.PreproductionStep, {
      foreignKey: 'stepId',
      as: 'step',
    });
  }
}

export function initializePreproductionTaskModel(sequelize: Sequelize): void {
  PreproductionTaskModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      stepId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'step_id',
        references: {
          model: PreproductionStepModel,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      activityType: {
        type: DataTypes.ENUM('informational', 'task'),
        allowNull: false,
        defaultValue: 'task',
        field: 'activity_type',
      },
      importance: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      recommendations: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      serviceLinks: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'service_links',
      },
      whatYouNeed: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'what_you_need',
      },
      whatYouNeedLink: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'what_you_need_link',
      },
      expertTip: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'expert_tip',
      },
      completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      dateCompleted: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'date_completed',
      },
      cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      supplier: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
      tableName: 'preproduction_tasks',
      underscored: true,
    }
  );
}
