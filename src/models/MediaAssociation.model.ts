import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import { MediaContext, MediaRole } from './Media.model';

export interface MediaAssociationAttributes {
  id: string;
  mediaId: string;
  associatableType: string;    // Dynamic type instead of enum
  associatableId: string;
  role: MediaRole;
  context: MediaContext;
  order: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MediaAssociationCreationAttributes extends Optional<MediaAssociationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class MediaAssociation extends Model<MediaAssociationAttributes, MediaAssociationCreationAttributes> implements MediaAssociationAttributes {
  public id!: string;
  public mediaId!: string;
  public associatableType!: string;
  public associatableId!: string;
  public role!: MediaRole;
  public context!: MediaContext;
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
          type: DataTypes.STRING,
          allowNull: false,
        },
        associatableId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'primary',
        },
        context: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
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
        underscored: false,
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
          {
            fields: ['context'],
            using: 'gin',
          },
          {
            fields: [{ name: 'context', operator: 'jsonb_path_ops' }],
            using: 'gin',
          },
        ],
      }
    );

    return MediaAssociation;
  }
}