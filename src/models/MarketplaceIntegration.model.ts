import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface MarketplaceIntegrationAttributes {
  id: string;
  userId: string;
  farmId?: string | null;
  marketplaceFarmerId?: string | null;
  externalPlatformRef: string;
  registrationStatus: string;
  listingStatus: string;
  lastSyncedAt?: Date | null;
  rawPayload?: Record<string, unknown> | null;
  lastCallbackEvent?: string | null;
  lastCallbackPayload?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

type MarketplaceIntegrationCreationAttributes = Optional<
  MarketplaceIntegrationAttributes,
  | 'id'
  | 'farmId'
  | 'marketplaceFarmerId'
  | 'registrationStatus'
  | 'listingStatus'
  | 'lastSyncedAt'
  | 'rawPayload'
  | 'lastCallbackEvent'
  | 'lastCallbackPayload'
  | 'createdAt'
  | 'updatedAt'
>;

export class MarketplaceIntegrationModel
  extends Model<MarketplaceIntegrationAttributes, MarketplaceIntegrationCreationAttributes>
  implements MarketplaceIntegrationAttributes {
  public id!: string;
  public userId!: string;
  public farmId?: string | null;
  public marketplaceFarmerId?: string | null;
  public externalPlatformRef!: string;
  public registrationStatus!: string;
  public listingStatus!: string;
  public lastSyncedAt?: Date | null;
  public rawPayload?: Record<string, unknown> | null;
  public lastCallbackEvent?: string | null;
  public lastCallbackPayload?: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public readonly user?: any;
  public readonly farm?: any;

  public static associate(models: any): void {
    MarketplaceIntegrationModel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    MarketplaceIntegrationModel.belongsTo(models.Farm, {
      foreignKey: 'farmId',
      as: 'farm',
    });
  }
}

export function initializeMarketplaceIntegrationModel(sequelize: Sequelize) {
  MarketplaceIntegrationModel.init(
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
      },
      farmId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'farm_id',
        references: {
          model: 'farms',
          key: 'id',
        },
      },
      marketplaceFarmerId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'marketplace_farmer_id',
      },
      externalPlatformRef: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: 'external_platform_ref',
      },
      registrationStatus: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'not_registered',
        field: 'registration_status',
      },
      listingStatus: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'not_listed',
        field: 'listing_status',
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_synced_at',
      },
      rawPayload: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'raw_payload',
      },
      lastCallbackEvent: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'last_callback_event',
      },
      lastCallbackPayload: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'last_callback_payload',
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
      tableName: 'marketplace_integrations',
      underscored: true,
      timestamps: true,
      indexes: [
        { name: 'marketplace_integrations_user_id_idx', unique: true, fields: ['user_id'] },
        { name: 'marketplace_integrations_external_ref_idx', unique: true, fields: ['external_platform_ref'] },
        { name: 'marketplace_integrations_farmer_id_idx', fields: ['marketplace_farmer_id'] },
      ],
    }
  );
}

export default MarketplaceIntegrationModel;
