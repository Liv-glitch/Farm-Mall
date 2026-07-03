import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface MarketplaceCallbackEventAttributes {
  id: string;
  marketplaceIntegrationId?: string | null;
  marketplaceFarmerId?: string | null;
  bookingRef?: string | null;
  event: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

type MarketplaceCallbackEventCreationAttributes = Optional<
  MarketplaceCallbackEventAttributes,
  'id' | 'marketplaceIntegrationId' | 'marketplaceFarmerId' | 'bookingRef' | 'createdAt'
>;

export class MarketplaceCallbackEventModel
  extends Model<MarketplaceCallbackEventAttributes, MarketplaceCallbackEventCreationAttributes>
  implements MarketplaceCallbackEventAttributes {
  public id!: string;
  public marketplaceIntegrationId?: string | null;
  public marketplaceFarmerId?: string | null;
  public bookingRef?: string | null;
  public event!: string;
  public payload!: Record<string, unknown>;
  public readonly createdAt!: Date;

  public readonly integration?: any;

  public static associate(models: any): void {
    MarketplaceCallbackEventModel.belongsTo(models.MarketplaceIntegration, {
      foreignKey: 'marketplaceIntegrationId',
      as: 'integration',
    });
  }
}

export function initializeMarketplaceCallbackEventModel(sequelize: Sequelize) {
  MarketplaceCallbackEventModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      marketplaceIntegrationId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'marketplace_integration_id',
        references: {
          model: 'marketplace_integrations',
          key: 'id',
        },
      },
      marketplaceFarmerId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'marketplace_farmer_id',
      },
      bookingRef: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'booking_ref',
      },
      event: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      sequelize,
      tableName: 'marketplace_callback_events',
      underscored: true,
      timestamps: false,
      indexes: [
        { name: 'marketplace_callback_events_integration_idx', fields: ['marketplace_integration_id'] },
        { name: 'marketplace_callback_events_farmer_id_idx', fields: ['marketplace_farmer_id'] },
        { name: 'marketplace_callback_events_booking_ref_idx', fields: ['booking_ref'] },
      ],
    }
  );
}

export default MarketplaceCallbackEventModel;
