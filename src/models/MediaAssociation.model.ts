import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

export interface MediaAssociationAttributes {
  id: string;
  mediaId: string;
  associatableType: 'plant_identification' | 'plant_health' | 'soil_test' | 'production_cycle' | 'user_profile' | 'pest_analysis';
  associatableId: string;
  role: 'primary' | 'thumbnail' | 'attachment' | 'comparison' | 'before' | 'after';
  order: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MediaAssociationCreationAttributes extends Optional<MediaAssociationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class MediaAssociation extends Model<MediaAssociationAttributes, MediaAssociationCreationAttributes> implements MediaAssociationAttributes {
  public id!: string;
  public mediaId!: string;
  public associatableType!: 'plant_identification' | 'plant_health' | 'soil_test' | 'production_cycle' | 'user_profile' | 'pest_analysis';
  public associatableId!: string;
  public role!: 'primary' | 'thumbnail' | 'attachment' | 'comparison' | 'before' | 'after';
  public order!: number;
  public metadata?: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof MediaAssociation {
    MediaAssociation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        mediaId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'media',
            key: 'id',
          },
        },
        associatableType: {
          type: DataTypes.ENUM('plant_identification', 'plant_health', 'soil_test', 'production_cycle', 'user_profile', 'pest_analysis'),
          allowNull: false,
        },
        associatableId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM('primary', 'thumbnail', 'attachment', 'comparison', 'before', 'after'),
          allowNull: false,
          defaultValue: 'primary',
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'MediaAssociation',
        tableName: 'media_associations',
        timestamps: true,
        indexes: [
          {
            fields: ['mediaId'],
          },
          {
            fields: ['associatableType', 'associatableId'],
          },
          {
            fields: ['associatableType', 'associatableId', 'role'],
          },
          {
            unique: true,
            fields: ['mediaId', 'associatableType', 'associatableId', 'role'],
          },
        ],
      }
    );

    return MediaAssociation;
  }
}