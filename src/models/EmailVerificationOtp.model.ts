import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface EmailVerificationOtpAttributes {
  id: string;
  userId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailVerificationOtpCreationAttributes
  extends Optional<EmailVerificationOtpAttributes, 'id' | 'attempts' | 'usedAt' | 'createdAt' | 'updatedAt'> {}

export class EmailVerificationOtpModel
  extends Model<EmailVerificationOtpAttributes, EmailVerificationOtpCreationAttributes>
  implements EmailVerificationOtpAttributes {
  public id!: string;
  public userId!: string;
  public otpHash!: string;
  public expiresAt!: Date;
  public attempts!: number;
  public usedAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any): void {
    EmailVerificationOtpModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

export function initializeEmailVerificationOtpModel(sequelize: Sequelize): void {
  EmailVerificationOtpModel.init(
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
      otpHash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        field: 'otp_hash',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
      },
      attempts: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
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
      tableName: 'email_verification_otps',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['expires_at'] },
        { fields: ['used_at'] },
        { fields: ['created_at'] },
      ],
    }
  );
}
