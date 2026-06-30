import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type CycleReportType = 'activity' | 'financial';

export interface CycleReport {
  id: string;
  userId: string;
  productionCycleId: string;
  type: CycleReportType;
  snapshotVersion: number;
  snapshotData: Record<string, unknown>;
  generatedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CycleReportCreationAttributes
  extends Optional<CycleReport, 'id' | 'snapshotVersion' | 'generatedAt' | 'createdAt' | 'updatedAt'> {}

export class CycleReportModel
  extends Model<CycleReport, CycleReportCreationAttributes>
  implements CycleReport {
  public id!: string;
  public userId!: string;
  public productionCycleId!: string;
  public type!: CycleReportType;
  public snapshotVersion!: number;
  public snapshotData!: Record<string, unknown>;
  public generatedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public readonly productionCycle?: any;
  public readonly user?: any;

  public static associate(models: any): void {
    CycleReportModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    CycleReportModel.belongsTo(models.ProductionCycle, {
      foreignKey: 'productionCycleId',
      as: 'productionCycle',
    });
  }
}

CycleReportModel.init(
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
      allowNull: false,
      field: 'production_cycle_id',
      references: {
        model: 'production_cycles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('activity', 'financial'),
      allowNull: false,
    },
    snapshotVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'snapshot_version',
    },
    snapshotData: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'snapshot_data',
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'generated_at',
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
    tableName: 'cycle_reports',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        name: 'cycle_reports_cycle_type_idx',
        unique: true,
        fields: ['production_cycle_id', 'type'],
      },
      {
        name: 'cycle_reports_user_id_idx',
        fields: ['user_id'],
      },
      {
        name: 'cycle_reports_generated_at_idx',
        fields: ['generated_at'],
      },
    ],
  }
);

export default CycleReportModel;
