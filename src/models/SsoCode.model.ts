import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface SsoCodeAttributes {
  id: string;
  userId: string;
  codeHash: string;
  redirectPath: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SsoCodeCreationAttributes
  extends Optional<SsoCodeAttributes, 'id' | 'usedAt' | 'createdAt' | 'updatedAt'> {}

export class SsoCodeModel
  extends Model<SsoCodeAttributes, SsoCodeCreationAttributes>
  implements SsoCodeAttributes {
  public id!: string;
  public userId!: string;
  public codeHash!: string;
  public redirectPath!: string;
  public expiresAt!: Date;
  public usedAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any): void {
    SsoCodeModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

export function initializeSsoCodeModel(sequelize: Sequelize): void {
  SsoCodeModel.init(
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
      },
      codeHash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        unique: true,
        field: 'code_hash',
      },
      redirectPath: {
        type: DataTypes.STRING(512),
        allowNull: false,
        defaultValue: '/marketplace',
        field: 'redirect_path',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at',
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
      tableName: 'sso_codes',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['code_hash'] },
        { fields: ['expires_at'] },
        { fields: ['used_at'] },
      ],
    }
  );
}

