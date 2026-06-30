import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface PasswordResetTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PasswordResetTokenCreationAttributes
  extends Optional<PasswordResetTokenAttributes, 'id' | 'usedAt' | 'createdAt' | 'updatedAt'> {}

export class PasswordResetTokenModel
  extends Model<PasswordResetTokenAttributes, PasswordResetTokenCreationAttributes>
  implements PasswordResetTokenAttributes {
  public id!: string;
  public userId!: string;
  public tokenHash!: string;
  public expiresAt!: Date;
  public usedAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any): void {
    PasswordResetTokenModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

export function initializePasswordResetTokenModel(sequelize: Sequelize): void {
  PasswordResetTokenModel.init(
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
      tokenHash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        unique: true,
        field: 'token_hash',
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
      tableName: 'password_reset_tokens',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['token_hash'] },
        { fields: ['expires_at'] },
        { fields: ['used_at'] },
      ],
    }
  );
}
