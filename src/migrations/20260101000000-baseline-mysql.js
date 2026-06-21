'use strict';

/**
 * Consolidated baseline migration for MySQL / MariaDB (dialect 'mysql').
 *
 * This single migration represents the FINAL state of the FarmMall schema after
 * the original 21 PostgreSQL migrations (001-021, archived under
 * `_postgres-legacy/`). It is intended to run first on a FRESH database.
 *
 * MySQL-specific notes:
 *  - All Postgres ENUM types are declared inline on the column with the FINAL
 *    value set (no CREATE TYPE / ALTER TYPE).
 *  - All JSONB columns are mapped to Sequelize.JSON.
 *  - JSON and TEXT columns carry NO DB-level defaultValue (MySQL/MariaDB reject
 *    DEFAULT on JSON/TEXT). The model-level defaultValue handles those at the
 *    app layer.
 *  - UUID primary keys and all UUID FK columns use Sequelize.UUID so FK column
 *    types match their targets exactly.
 *  - Timestamps default to CURRENT_TIMESTAMP via Sequelize.literal.
 *  - GIN indexes (Postgres-only) on JSON `context` columns are intentionally
 *    omitted (MySQL has no GIN index type).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.literal('CURRENT_TIMESTAMP');

    // ------------------------------------------------------------------
    // users
    // ------------------------------------------------------------------
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      full_name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      phone_number: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      county: { type: Sequelize.STRING(100), allowNull: false },
      sub_county: { type: Sequelize.STRING(100), allowNull: false },
      // TEXT: no DB default
      profile_picture_url: { type: Sequelize.TEXT, allowNull: true },
      location_lat: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      location_lng: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      subscription_type: {
        type: Sequelize.ENUM('free', 'premium'),
        allowNull: false,
        defaultValue: 'free',
      },
      subscription_expires_at: { type: Sequelize.DATE, allowNull: true },
      email_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      phone_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      role: {
        type: Sequelize.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('users', ['email'], {
      name: 'users_email_idx',
      unique: true,
    });
    await queryInterface.addIndex('users', ['phone_number'], {
      name: 'users_phone_number_idx',
      unique: true,
    });
    await queryInterface.addIndex('users', ['county'], { name: 'users_county_idx' });
    await queryInterface.addIndex('users', ['sub_county'], { name: 'users_sub_county_idx' });
    await queryInterface.addIndex('users', ['subscription_type'], { name: 'users_subscription_type_idx' });
    await queryInterface.addIndex('users', ['created_at'], { name: 'users_created_at_idx' });

    // ------------------------------------------------------------------
    // crop_varieties
    // (seed_cost_per_bag was dropped in legacy 017; new cost columns added)
    // ------------------------------------------------------------------
    await queryInterface.createTable('crop_varieties', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      // Model uses STRING(50) with an app-level isIn check (extensible).
      // Final legacy enum set: potato, maize, beans, tomato, onion, cabbage,
      // carrot, spinach, kale, lettuce, pepper, cucumber, squash.
      crop_type: { type: Sequelize.STRING(50), allowNull: false },
      maturity_period_days: { type: Sequelize.INTEGER, allowNull: false },
      seed_size_1_bags_per_acre: { type: Sequelize.INTEGER, allowNull: false },
      seed_size_2_bags_per_acre: { type: Sequelize.INTEGER, allowNull: false },
      seed_size_1_cost_per_bag: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      seed_size_2_cost_per_bag: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      fertilizer_cost_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      herbicide_cost_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      fungicide_cost_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      insecticide_cost_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      labor_cost_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      land_preparation_cost_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      miscellaneous_cost_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      average_yield_per_acre: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      cost_data_updated_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('crop_varieties', ['name'], {
      name: 'crop_varieties_name_idx',
      unique: true,
    });
    await queryInterface.addIndex('crop_varieties', ['crop_type'], { name: 'crop_varieties_type_idx' });
    await queryInterface.addIndex('crop_varieties', ['maturity_period_days'], { name: 'crop_varieties_maturity_idx' });
    await queryInterface.addIndex('crop_varieties', ['fertilizer_cost_per_acre'], { name: 'crop_varieties_fertilizer_cost_idx' });
    await queryInterface.addIndex('crop_varieties', ['labor_cost_per_acre'], { name: 'crop_varieties_labor_cost_idx' });

    // ------------------------------------------------------------------
    // farms (depends on users)
    // ------------------------------------------------------------------
    await queryInterface.createTable('farms', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      location_lat: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      location_lng: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      size_acres: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('farms', ['owner_id'], { name: 'farms_owner_id_idx' });
    await queryInterface.addIndex('farms', ['location'], { name: 'farms_location_idx' });

    // ------------------------------------------------------------------
    // production_cycles (depends on users, farms, crop_varieties)
    // farm_id added in legacy 010 (final state: NOT NULL)
    // ------------------------------------------------------------------
    await queryInterface.createTable('production_cycles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farm_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'farms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      crop_variety_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'crop_varieties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      land_size_acres: { type: Sequelize.DECIMAL(8, 2), allowNull: false },
      farm_location: { type: Sequelize.STRING(255), allowNull: true },
      farm_location_lat: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      farm_location_lng: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      planting_date: { type: Sequelize.DATEONLY, allowNull: true },
      estimated_harvest_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_harvest_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('planning', 'active', 'harvested', 'archived'),
        allowNull: false,
        defaultValue: 'planning',
      },
      total_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_yield_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('production_cycles', ['user_id'], { name: 'production_cycles_user_id_idx' });
    await queryInterface.addIndex('production_cycles', ['farm_id'], { name: 'production_cycles_farm_id_idx' });
    await queryInterface.addIndex('production_cycles', ['crop_variety_id'], { name: 'production_cycles_crop_variety_id_idx' });
    await queryInterface.addIndex('production_cycles', ['status'], { name: 'production_cycles_status_idx' });
    await queryInterface.addIndex('production_cycles', ['planting_date'], { name: 'production_cycles_planting_date_idx' });
    await queryInterface.addIndex('production_cycles', ['estimated_harvest_date'], { name: 'production_cycles_harvest_date_idx' });
    await queryInterface.addIndex('production_cycles', ['farm_location_lat', 'farm_location_lng'], { name: 'production_cycles_location_idx' });

    // ------------------------------------------------------------------
    // activities (depends on users, production_cycles)
    // labor_type enum changed in legacy 018 to manual-family/manual-hired/mechanized
    // ------------------------------------------------------------------
    await queryInterface.createTable('activities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      production_cycle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'production_cycles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'planting', 'fertilizing', 'weeding', 'pest_control',
          'irrigation', 'harvesting', 'soil_preparation', 'other'
        ),
        allowNull: false,
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      scheduled_date: { type: Sequelize.DATE, allowNull: false },
      completed_date: { type: Sequelize.DATE, allowNull: true },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      labor_hours: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
      labor_type: {
        type: Sequelize.ENUM('manual-family', 'manual-hired', 'mechanized'),
        allowNull: true,
      },
      // JSON: no DB default (model defaults to [])
      inputs: { type: Sequelize.JSON, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      // JSON: no DB default
      weather: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'planned',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('activities', ['user_id'], { name: 'activities_user_id_idx' });
    await queryInterface.addIndex('activities', ['production_cycle_id'], { name: 'activities_production_cycle_id_idx' });
    await queryInterface.addIndex('activities', ['scheduled_date'], { name: 'activities_scheduled_date_idx' });
    await queryInterface.addIndex('activities', ['status'], { name: 'activities_status_idx' });
    await queryInterface.addIndex('activities', ['type'], { name: 'activities_type_idx' });

    // ------------------------------------------------------------------
    // farm_collaborators (depends on farms, users)
    // role enum final (legacy 007 + 011): viewer, manager, worker, family_member, admin
    // status enum final (legacy 012): pending, active, inactive
    // ------------------------------------------------------------------
    await queryInterface.createTable('farm_collaborators', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      farm_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'farms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      collaborator_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      invite_email: { type: Sequelize.STRING, allowNull: true },
      invite_phone: { type: Sequelize.STRING, allowNull: true },
      role: {
        type: Sequelize.ENUM('viewer', 'manager', 'worker', 'family_member', 'admin'),
        allowNull: false,
        defaultValue: 'viewer',
      },
      // JSON: no DB default (model defaults to permissions object)
      permissions: { type: Sequelize.JSON, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'inactive'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Model declares inviteToken as UUID; keep UUID + unique.
      invite_token: { type: Sequelize.UUID, allowNull: true, unique: true },
      invite_expires_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('farm_collaborators', ['farm_id'], { name: 'farm_collaborators_farm_id_idx' });
    await queryInterface.addIndex('farm_collaborators', ['collaborator_id'], { name: 'farm_collaborators_collaborator_id_idx' });
    await queryInterface.addIndex('farm_collaborators', ['invite_email'], { name: 'farm_collaborators_invite_email_idx' });
    await queryInterface.addIndex('farm_collaborators', ['invite_phone'], { name: 'farm_collaborators_invite_phone_idx' });
    await queryInterface.addIndex('farm_collaborators', ['status'], { name: 'farm_collaborators_status_idx' });

    // ------------------------------------------------------------------
    // pest_analyses (depends on users, production_cycles)
    // ------------------------------------------------------------------
    await queryInterface.createTable('pest_analyses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      production_cycle_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'production_cycles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      image_url: { type: Sequelize.TEXT, allowNull: false },
      crop_type: { type: Sequelize.STRING(100), allowNull: false },
      location_lat: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      location_lng: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      // JSON
      analysis_result: { type: Sequelize.JSON, allowNull: false },
      confidence_score: { type: Sequelize.DECIMAL(5, 4), allowNull: false },
      status: {
        type: Sequelize.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing',
      },
      ai_model_version: { type: Sequelize.STRING(50), allowNull: false },
      processing_time_ms: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('pest_analyses', ['user_id'], { name: 'pest_analyses_user_id_idx' });
    await queryInterface.addIndex('pest_analyses', ['production_cycle_id'], { name: 'pest_analyses_production_cycle_id_idx' });
    await queryInterface.addIndex('pest_analyses', ['created_at'], { name: 'pest_analyses_created_at_idx' });

    // ------------------------------------------------------------------
    // weather_requests (depends on users)
    // ------------------------------------------------------------------
    await queryInterface.createTable('weather_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      location_lat: { type: Sequelize.DECIMAL(10, 8), allowNull: false },
      location_lng: { type: Sequelize.DECIMAL(11, 8), allowNull: false },
      request_type: {
        type: Sequelize.ENUM('current', 'forecast', 'historical'),
        allowNull: false,
      },
      // JSON
      response_data: { type: Sequelize.JSON, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('weather_requests', ['user_id'], { name: 'weather_requests_user_id_idx' });
    await queryInterface.addIndex('weather_requests', ['created_at'], { name: 'weather_requests_created_at_idx' });

    // ------------------------------------------------------------------
    // plant_identifications (depends on users)
    // ------------------------------------------------------------------
    await queryInterface.createTable('plant_identifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      image_url: { type: Sequelize.TEXT, allowNull: false },
      thumbnail_url: { type: Sequelize.TEXT, allowNull: true },
      original_filename: { type: Sequelize.TEXT, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      // JSON
      identification_result: { type: Sequelize.JSON, allowNull: false },
      confidence_score: { type: Sequelize.DECIMAL(5, 4), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('plant_identifications', ['user_id'], { name: 'plant_identifications_user_id_idx' });
    await queryInterface.addIndex('plant_identifications', ['created_at'], { name: 'plant_identifications_created_at_idx' });
    await queryInterface.addIndex('plant_identifications', ['confidence_score'], { name: 'plant_identifications_confidence_score_idx' });

    // ------------------------------------------------------------------
    // plant_health_assessments (depends on users)
    // notes + provider_metadata added in legacy 019
    // ------------------------------------------------------------------
    await queryInterface.createTable('plant_health_assessments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      image_url: { type: Sequelize.TEXT, allowNull: false },
      thumbnail_url: { type: Sequelize.TEXT, allowNull: true },
      original_filename: { type: Sequelize.TEXT, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      // JSON
      health_assessment_result: { type: Sequelize.JSON, allowNull: false },
      is_healthy: { type: Sequelize.BOOLEAN, allowNull: true },
      // JSON
      diseases: { type: Sequelize.JSON, allowNull: true },
      // JSON
      treatment_suggestions: { type: Sequelize.JSON, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      // JSON
      provider_metadata: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('plant_health_assessments', ['user_id'], { name: 'plant_health_assessments_user_id_idx' });
    await queryInterface.addIndex('plant_health_assessments', ['created_at'], { name: 'plant_health_assessments_created_at_idx' });
    await queryInterface.addIndex('plant_health_assessments', ['is_healthy'], { name: 'plant_health_assessments_is_healthy_idx' });

    // ------------------------------------------------------------------
    // soil_tests (depends on users, farms)
    // ------------------------------------------------------------------
    await queryInterface.createTable('soil_tests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farm_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'farms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      document_url: { type: Sequelize.TEXT, allowNull: false },
      thumbnail_url: { type: Sequelize.TEXT, allowNull: true },
      original_filename: { type: Sequelize.STRING(255), allowNull: false },
      // JSON
      analysis_result: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'analyzed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      ai_model_version: { type: Sequelize.STRING(50), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('soil_tests', ['user_id'], { name: 'soil_tests_user_id_idx' });
    await queryInterface.addIndex('soil_tests', ['farm_id'], { name: 'soil_tests_farm_id_idx' });
    await queryInterface.addIndex('soil_tests', ['status'], { name: 'soil_tests_status_idx' });
    await queryInterface.addIndex('soil_tests', ['created_at'], { name: 'soil_tests_created_at_idx' });

    // ------------------------------------------------------------------
    // media (depends on users)
    // NOTE: this model uses camelCase column names (underscored: false).
    // associatableType/role were changed from ENUM to STRING in legacy 016;
    // context column added in legacy 016. GIN indexes are Postgres-only and
    // are intentionally omitted for MySQL.
    // ------------------------------------------------------------------
    await queryInterface.createTable('media', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fileName: { type: Sequelize.STRING, allowNull: false },
      originalName: { type: Sequelize.STRING, allowNull: false },
      mimeType: { type: Sequelize.STRING, allowNull: false },
      size: { type: Sequelize.BIGINT, allowNull: false },
      hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
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
      storagePath: { type: Sequelize.STRING, allowNull: false },
      publicUrl: { type: Sequelize.TEXT, allowNull: true },
      // JSON columns: no DB default (model defaults handle them)
      variants: { type: Sequelize.JSON, allowNull: false },
      metadata: { type: Sequelize.JSON, allowNull: false },
      analytics: { type: Sequelize.JSON, allowNull: false },
      isPublic: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      expiresAt: { type: Sequelize.DATE, allowNull: true },
      // JSON
      context: { type: Sequelize.JSON, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('media', ['userId'], { name: 'media_user_id_idx' });
    await queryInterface.addIndex('media', ['status'], { name: 'media_status_idx' });
    await queryInterface.addIndex('media', ['mimeType'], { name: 'media_mime_type_idx' });
    await queryInterface.addIndex('media', ['hash'], { name: 'media_hash_unique_idx', unique: true });
    await queryInterface.addIndex('media', ['createdAt'], { name: 'media_created_at_idx' });

    // ------------------------------------------------------------------
    // media_associations (depends on media)
    // ------------------------------------------------------------------
    await queryInterface.createTable('media_associations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      mediaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'media', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // STRING (was ENUM, made dynamic in legacy 016)
      associatableType: { type: Sequelize.STRING, allowNull: false },
      associatableId: { type: Sequelize.UUID, allowNull: false },
      // STRING (was ENUM, made dynamic in legacy 016)
      role: { type: Sequelize.STRING, allowNull: false, defaultValue: 'primary' },
      // JSON
      context: { type: Sequelize.JSON, allowNull: false },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      // JSON
      metadata: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('media_associations', ['mediaId'], { name: 'media_associations_media_id_idx' });
    await queryInterface.addIndex('media_associations', ['associatableType', 'associatableId'], { name: 'media_associations_associatable_idx' });
    await queryInterface.addIndex('media_associations', ['associatableType', 'associatableId', 'role'], { name: 'media_associations_type_id_role_idx' });
    // Composite UNIQUE: mediaId (UUID/CHAR(36)) + associatableType (VARCHAR 255)
    // + associatableId (CHAR(36)) + role (VARCHAR 255). Under utf8mb4 the two
    // VARCHAR(255) columns are 1020 bytes each -> total well over the 3072-byte
    // index key limit. Cap the string columns at 191 chars within the index to
    // stay safe. (Index prefix lengths; column definitions are unchanged.)
    await queryInterface.addIndex('media_associations', [
      'mediaId',
      { name: 'associatableType', length: 191 },
      'associatableId',
      { name: 'role', length: 191 },
    ], { name: 'media_associations_unique_idx', unique: true });

    // ------------------------------------------------------------------
    // preproduction_plans (depends on users)
    // ------------------------------------------------------------------
    await queryInterface.createTable('preproduction_plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      planting_date: { type: Sequelize.DATEONLY, allowNull: false },
      location: { type: Sequelize.STRING(255), allowNull: false },
      potato_variety: {
        type: Sequelize.ENUM('Shangi', 'Sherekea', 'Unica', 'Markies'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('not_started', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'not_started',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('preproduction_plans', ['user_id'], { name: 'preproduction_plans_user_id_idx' });
    await queryInterface.addIndex('preproduction_plans', ['status'], { name: 'preproduction_plans_status_idx' });

    // ------------------------------------------------------------------
    // preproduction_steps (depends on preproduction_plans)
    // ------------------------------------------------------------------
    await queryInterface.createTable('preproduction_steps', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'preproduction_plans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      date_range_start: { type: Sequelize.DATEONLY, allowNull: true },
      date_range_end: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('preproduction_steps', ['plan_id'], { name: 'preproduction_steps_plan_id_idx' });

    // ------------------------------------------------------------------
    // preproduction_tasks (depends on preproduction_steps)
    // ------------------------------------------------------------------
    await queryInterface.createTable('preproduction_tasks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      step_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'preproduction_steps', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      title: { type: Sequelize.STRING(255), allowNull: false },
      what_you_need: { type: Sequelize.TEXT, allowNull: true },
      what_you_need_link: { type: Sequelize.TEXT, allowNull: true },
      expert_tip: { type: Sequelize.TEXT, allowNull: true },
      completed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      date_completed: { type: Sequelize.DATEONLY, allowNull: true },
      cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      supplier: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('preproduction_tasks', ['step_id'], { name: 'preproduction_tasks_step_id_idx' });

    // ------------------------------------------------------------------
    // events (depends on users)
    // ------------------------------------------------------------------
    await queryInterface.createTable('events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      date: { type: Sequelize.DATE, allowNull: false },
      mode: { type: Sequelize.ENUM('online', 'physical'), allowNull: false },
      location: { type: Sequelize.TEXT, allowNull: true },
      registration_link: { type: Sequelize.TEXT, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.addIndex('events', ['date'], { name: 'events_date_idx' });
    await queryInterface.addIndex('events', ['mode'], { name: 'events_mode_idx' });
    await queryInterface.addIndex('events', ['created_by'], { name: 'events_created_by_idx' });
  },

  async down(queryInterface, Sequelize) {
    // Drop in reverse FK-dependency order.
    await queryInterface.dropTable('events');
    await queryInterface.dropTable('preproduction_tasks');
    await queryInterface.dropTable('preproduction_steps');
    await queryInterface.dropTable('preproduction_plans');
    await queryInterface.dropTable('media_associations');
    await queryInterface.dropTable('media');
    await queryInterface.dropTable('soil_tests');
    await queryInterface.dropTable('plant_health_assessments');
    await queryInterface.dropTable('plant_identifications');
    await queryInterface.dropTable('weather_requests');
    await queryInterface.dropTable('pest_analyses');
    await queryInterface.dropTable('farm_collaborators');
    await queryInterface.dropTable('activities');
    await queryInterface.dropTable('production_cycles');
    await queryInterface.dropTable('farms');
    await queryInterface.dropTable('crop_varieties');
    await queryInterface.dropTable('users');
  },
};
