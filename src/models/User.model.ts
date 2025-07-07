import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { User as UserInterface } from '../types/auth.types';

// Define creation attributes (optional id and timestamps)
interface UserCreationAttributes extends Optional<UserInterface, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserModel extends Model<UserInterface, UserCreationAttributes> implements UserInterface {
  public id!: string;
  public fullName!: string;
  public email?: string;
  public phoneNumber?: string;
  public passwordHash!: string;
  public county!: string;
  public subCounty!: string;
  public profilePictureUrl?: string;
  public locationLat?: number;
  public locationLng?: number;
  public subscriptionType!: 'free' | 'premium';
  public subscriptionExpiresAt?: Date;
  public emailVerified!: boolean;
  public phoneVerified!: boolean;
  public role!: 'user' | 'admin';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Model associations
  public static associate(models: any): void {
    UserModel.hasMany(models.ProductionCycle, {
      foreignKey: 'userId',
      as: 'productionCycles',
    });
    
    UserModel.hasMany(models.PestAnalysis, {
      foreignKey: 'userId',
      as: 'pestAnalyses',
    });

    UserModel.hasMany(models.WeatherRequest, {
      foreignKey: 'userId',
      as: 'weatherRequests',
    });
  }

  // Instance methods
  public override toJSON(): Omit<UserInterface, 'passwordHash'> {
    const values = { ...this.get() };
    delete (values as any).passwordHash;
    return values as Omit<UserInterface, 'passwordHash'>;
  }

  public isEmailVerified(): boolean {
    return this.emailVerified;
  }

  public isPhoneVerified(): boolean {
    return this.phoneVerified;
  }

  public isPremiumUser(): boolean {
    return this.subscriptionType === 'premium' && 
           (!this.subscriptionExpiresAt || this.subscriptionExpiresAt > new Date());
  }

  public getSubscriptionStatus(): 'active' | 'expired' | 'free' {
    if (this.subscriptionType === 'free') return 'free';
    if (!this.subscriptionExpiresAt || this.subscriptionExpiresAt > new Date()) return 'active';
    return 'expired';
  }

  // Feature usage methods
  public async countProductionCycles(options?: any): Promise<number> {
    return (this as any).countProductionCycles(options);
  }

  public async countPestAnalyses(options?: any): Promise<number> {
    return (this as any).countPestAnalyses(options);
  }

  public async countWeatherRequests(options?: any): Promise<number> {
    return (this as any).countWeatherRequests(options);
  }
}

// Initialize model function - called after database connection
export function initializeUserModel(sequelize: Sequelize) {
  UserModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      fullName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 255],
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
        validate: {
          is: /^\+?[1-9]\d{1,14}$/, // International phone number format
        },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      county: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      subCounty: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'sub_county',
        validate: {
          notEmpty: true,
        },
      },
      profilePictureUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'profile_picture_url',
        validate: {
          isUrl: true,
        },
      },
      locationLat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        field: 'location_lat',
        validate: {
          min: -90,
          max: 90,
        },
      },
      locationLng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        field: 'location_lng',
        validate: {
          min: -180,
          max: 180,
        },
      },
      subscriptionType: {
        type: DataTypes.ENUM('free', 'premium'),
        allowNull: false,
        defaultValue: 'free',
        field: 'subscription_type',
      },
      subscriptionExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'subscription_expires_at',
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'email_verified',
      },
      phoneVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'phone_verified',
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
        validate: {
          isIn: [['user', 'admin']],
        },
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
      tableName: 'users',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: 'users_email_idx',
          unique: true,
          fields: ['email'],
        },
        {
          name: 'users_phone_number_idx',
          unique: true,
          fields: ['phone_number'],
        },
        {
          name: 'users_county_idx',
          fields: ['county'],
        },
        {
          name: 'users_sub_county_idx',
          fields: ['sub_county'],
        },
      ],
      validate: {
        eitherEmailOrPhone() {
          if (!this.email && !this.phoneNumber) {
            throw new Error('Either email or phone number must be provided');
          }
        },
      },
    }
  );
}

export default UserModel; 