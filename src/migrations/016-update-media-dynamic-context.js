'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add context column to media table
    await queryInterface.addColumn('media', 'context', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    // Create GIN indexes for context JSONB column
    await queryInterface.addIndex('media', ['context'], {
      using: 'gin',
      name: 'media_context_gin_idx',
    });

    // Add context column to media_associations table
    await queryInterface.addColumn('media_associations', 'context', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    // Create GIN indexes for media_associations context JSONB column
    await queryInterface.addIndex('media_associations', ['context'], {
      using: 'gin',
      name: 'media_associations_context_gin_idx',
    });

    // Drop the old ENUM constraint for associatableType to make it dynamic
    await queryInterface.changeColumn('media_associations', 'associatableType', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Drop the old ENUM constraint for role to make it dynamic
    await queryInterface.changeColumn('media_associations', 'role', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'primary',
    });

    // Update existing records with default context
    // This migration assumes existing data needs to be converted
    await queryInterface.sequelize.query(`
      UPDATE media 
      SET context = jsonb_build_object(
        'category', 'legacy',
        'subcategory', CASE 
          WHEN "mimeType" LIKE 'image/%' THEN 'images'
          WHEN "mimeType" LIKE 'video/%' THEN 'videos'
          WHEN "mimeType" = 'application/pdf' THEN 'documents'
          ELSE 'files'
        END,
        'contextId', "userId"::text
      )
      WHERE context = '{}'::jsonb;
    `);

    await queryInterface.sequelize.query(`
      UPDATE media_associations 
      SET context = jsonb_build_object(
        'category', 'legacy',
        'subcategory', "associatableType",
        'contextId', "associatableId"::text
      )
      WHERE context = '{}'::jsonb;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove GIN indexes
    await queryInterface.removeIndex('media_associations', 'media_associations_context_gin_idx');
    await queryInterface.removeIndex('media', 'media_context_gin_idx');

    // Remove context columns
    await queryInterface.removeColumn('media_associations', 'context');
    await queryInterface.removeColumn('media', 'context');

    // Restore ENUM constraints (this is tricky in PostgreSQL, so we'll recreate the ENUMs)
    await queryInterface.changeColumn('media_associations', 'associatableType', {
      type: Sequelize.ENUM('plant_identification', 'plant_health', 'soil_test', 'production_cycle', 'user_profile', 'pest_analysis'),
      allowNull: false,
    });

    await queryInterface.changeColumn('media_associations', 'role', {
      type: Sequelize.ENUM('primary', 'thumbnail', 'attachment', 'comparison', 'before', 'after'),
      allowNull: false,
      defaultValue: 'primary',
    });
  },
};