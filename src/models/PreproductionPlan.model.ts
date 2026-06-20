import { Model, DataTypes, Sequelize } from 'sequelize';
import { UserModel } from './User.model';

export type PotatoVariety = 'Shangi' | 'Sherekea' | 'Unica' | 'Markies';
export type PreproductionPlanStatus = 'not_started' | 'in_progress' | 'completed';

interface PreproductionPlanAttributes {
  id: string;
  userId: string;
  name: string;
  plantingDate: string;
  location: string;
  potatoVariety: PotatoVariety;
  status: PreproductionPlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface PreproductionPlanCreationAttributes
  extends Omit<PreproductionPlanAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {
  status?: PreproductionPlanStatus;
}

export class PreproductionPlanModel
  extends Model<PreproductionPlanAttributes, PreproductionPlanCreationAttributes>
  implements PreproductionPlanAttributes
{
  public id!: string;
  public userId!: string;
  public name!: string;
  public plantingDate!: string;
  public location!: string;
  public potatoVariety!: PotatoVariety;
  public status!: PreproductionPlanStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any): void {
    PreproductionPlanModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    PreproductionPlanModel.hasMany(models.PreproductionStep, {
      foreignKey: 'planId',
      as: 'steps',
    });
  }
}

export function initializePreproductionPlanModel(sequelize: Sequelize): void {
  PreproductionPlanModel.init(
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      plantingDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'planting_date',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      potatoVariety: {
        type: DataTypes.ENUM('Shangi', 'Sherekea', 'Unica', 'Markies'),
        allowNull: false,
        field: 'potato_variety',
      },
      status: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'not_started',
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
      tableName: 'preproduction_plans',
      underscored: true,
    }
  );
}
