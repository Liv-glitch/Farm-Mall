import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

export interface MediaVariant {
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original';
  url: string;
  width?: number;
  height?: number;
  fileSize: number;
}

export interface MediaAnalytics {
  uploadTime: Date;
  processingTime?: number;
  downloadCount: number;
  lastAccessed?: Date;
  compressionRatio?: number;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  colorProfile?: string;
  camera?: {
    make?: string;
    model?: string;
    settings?: Record<string, any>;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  tags?: string[];
  description?: string;
  aiGenerated?: {
    confidence: number;
    predictions: Array<{
      label: string;
      confidence: number;
    }>;
  };
}

export interface MediaAttributes {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  hash: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  storageProvider: 'supabase' | 'local';
  storagePath: string;
  publicUrl?: string;
  variants: MediaVariant[];
  metadata: MediaMetadata;
  analytics: MediaAnalytics;
  isPublic: boolean;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MediaCreationAttributes extends Optional<MediaAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Media extends Model<MediaAttributes, MediaCreationAttributes> implements MediaAttributes {
  public id!: string;
  public userId!: string;
  public fileName!: string;
  public originalName!: string;
  public mimeType!: string;
  public size!: number;
  public hash!: string;
  public status!: 'uploading' | 'processing' | 'ready' | 'failed';
  public storageProvider!: 'supabase' | 'local';
  public storagePath!: string;
  public publicUrl?: string;
  public variants!: MediaVariant[];
  public metadata!: MediaMetadata;
  public analytics!: MediaAnalytics;
  public isPublic!: boolean;
  public expiresAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof Media {
    Media.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        fileName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        originalName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        mimeType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        size: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        hash: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        status: {
          type: DataTypes.ENUM('uploading', 'processing', 'ready', 'failed'),
          allowNull: false,
          defaultValue: 'uploading',
        },
        storageProvider: {
          type: DataTypes.ENUM('supabase', 'local'),
          allowNull: false,
          defaultValue: 'supabase',
        },
        storagePath: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        publicUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        variants: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        analytics: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {
            uploadTime: new Date(),
            downloadCount: 0,
          },
        },
        isPublic: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Media',
        tableName: 'media',
        timestamps: true,
        indexes: [
          {
            fields: ['userId'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['mimeType'],
          },
          {
            fields: ['hash'],
            unique: true,
          },
          {
            fields: ['createdAt'],
          },
        ],
      }
    );

    return Media;
  }
}