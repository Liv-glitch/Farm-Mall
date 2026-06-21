'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create media table
    await queryInterface.createTable('media', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('uploading', 'processing', 'ready', 'failed'),
        allowNull: false,
        defaultValue: 'uploading',
      },
      storageProvider: {
        type: Sequelize.ENUM('supabase', 'local'),
        allowNull: false,
        defaultValue: 'supabase',
      },
      storagePath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      publicUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      variants: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      analytics: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          uploadTime: new Date(),
          downloadCount: 0,
        },
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create media associations table
    await queryInterface.createTable('media_associations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      mediaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'media',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      associatableType: {
        type: Sequelize.ENUM('plant_identification', 'plant_health', 'soil_test', 'production_cycle', 'user_profile', 'pest_analysis'),
        allowNull: false,
      },
      associatableId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('primary', 'thumbnail', 'attachment', 'comparison', 'before', 'after'),
        allowNull: false,
        defaultValue: 'primary',
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes for media table
    await queryInterface.addIndex('media', ['userId'], {
      name: 'media_user_id_idx',
    });

    await queryInterface.addIndex('media', ['status'], {
      name: 'media_status_idx',
    });

    await queryInterface.addIndex('media', ['mimeType'], {
      name: 'media_mime_type_idx',
    });

    await queryInterface.addIndex('media', ['hash'], {
      unique: true,
      name: 'media_hash_unique_idx',
    });

    await queryInterface.addIndex('media', ['createdAt'], {
      name: 'media_created_at_idx',
    });

    // Create indexes for media associations table
    await queryInterface.addIndex('media_associations', ['mediaId'], {
      name: 'media_associations_media_id_idx',
    });

    await queryInterface.addIndex('media_associations', ['associatableType', 'associatableId'], {
      name: 'media_associations_associatable_idx',
    });

    await queryInterface.addIndex('media_associations', ['associatableType', 'associatableId', 'role'], {
      name: 'media_associations_type_id_role_idx',
    });

    await queryInterface.addIndex('media_associations', ['mediaId', 'associatableType', 'associatableId', 'role'], {
      unique: true,
      name: 'media_associations_unique_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('media_associations', 'media_associations_unique_idx');
    await queryInterface.removeIndex('media_associations', 'media_associations_type_id_role_idx');
    await queryInterface.removeIndex('media_associations', 'media_associations_associatable_idx');
    await queryInterface.removeIndex('media_associations', 'media_associations_media_id_idx');
    
    await queryInterface.removeIndex('media', 'media_created_at_idx');
    await queryInterface.removeIndex('media', 'media_hash_unique_idx');
    await queryInterface.removeIndex('media', 'media_mime_type_idx');
    await queryInterface.removeIndex('media', 'media_status_idx');
    await queryInterface.removeIndex('media', 'media_user_id_idx');

    // Drop tables
    await queryInterface.dropTable('media_associations');
    await queryInterface.dropTable('media');
  },
};