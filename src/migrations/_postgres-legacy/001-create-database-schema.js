'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create all ENUMs first
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- User subscription type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_subscription_type') THEN
          CREATE TYPE "enum_users_subscription_type" AS ENUM('free', 'premium');
        END IF;
        
        -- Production cycle status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_production_cycles_status') THEN
          CREATE TYPE "enum_production_cycles_status" AS ENUM('planning', 'active', 'harvested', 'archived');
        END IF;
        
        -- Activity type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_activities_type') THEN
          CREATE TYPE "enum_activities_type" AS ENUM('planting', 'fertilizing', 'weeding', 'pest_control', 'irrigation', 'harvesting', 'soil_preparation', 'other');
        END IF;
        
        -- Activity status enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_activities_status') THEN
          CREATE TYPE "enum_activities_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');
        END IF;
        
        -- Labor type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_activities_labor_type') THEN
          CREATE TYPE "enum_activities_labor_type" AS ENUM('hired', 'family', 'cooperative');
        END IF;
        
        -- Crop type enum
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_crop_varieties_crop_type') THEN
          CREATE TYPE "enum_crop_varieties_crop_type" AS ENUM('potato', 'maize', 'beans', 'tomato');
        END IF;
      END
      $$;
    `);

    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      county: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      sub_county: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      profile_picture_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      location_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      location_lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      subscription_type: {
        type: Sequelize.ENUM('free', 'premium'),
        allowNull: false,
        defaultValue: 'free',
      },
      subscription_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      phone_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email'], {
      name: 'users_email_idx',
      unique: true,
      where: {
        email: {
          [Sequelize.Op.ne]: null,
        },
      },
    });

    await queryInterface.addIndex('users', ['phone_number'], {
      name: 'users_phone_number_idx',
      unique: true,
      where: {
        phone_number: {
          [Sequelize.Op.ne]: null,
        },
      },
    });

    await queryInterface.addIndex('users', ['county'], {
      name: 'users_county_idx',
    });

    await queryInterface.addIndex('users', ['subscription_type'], {
      name: 'users_subscription_type_idx',
    });

    await queryInterface.addIndex('users', ['created_at'], {
      name: 'users_created_at_idx',
    });

    // Create crop_varieties table
    await queryInterface.createTable('crop_varieties', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      crop_type: {
        type: Sequelize.ENUM('potato', 'maize', 'beans', 'tomato'),
        allowNull: false,
      },
      maturity_period_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      seed_size_1_bags_per_acre: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      seed_size_2_bags_per_acre: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      seed_cost_per_bag: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add crop varieties indexes
    await queryInterface.addIndex('crop_varieties', ['name'], {
      name: 'crop_varieties_name_idx',
      unique: true,
    });
    await queryInterface.addIndex('crop_varieties', ['crop_type'], {
      name: 'crop_varieties_type_idx',
    });
    await queryInterface.addIndex('crop_varieties', ['maturity_period_days'], {
      name: 'crop_varieties_maturity_idx',
    });

    // Create production_cycles table
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
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      crop_variety_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'crop_varieties',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      land_size_acres: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
      },
      farm_location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      farm_location_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      farm_location_lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      planting_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      estimated_harvest_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      actual_harvest_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('planning', 'active', 'harvested', 'archived'),
        allowNull: false,
        defaultValue: 'planning',
      },
      total_cost: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_yield_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add production cycles indexes
    await queryInterface.addIndex('production_cycles', ['user_id'], {
      name: 'production_cycles_user_id_idx',
    });
    await queryInterface.addIndex('production_cycles', ['crop_variety_id'], {
      name: 'production_cycles_crop_variety_id_idx',
    });
    await queryInterface.addIndex('production_cycles', ['status'], {
      name: 'production_cycles_status_idx',
    });
    await queryInterface.addIndex('production_cycles', ['planting_date'], {
      name: 'production_cycles_planting_date_idx',
    });

    // Create activities table
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
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      production_cycle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'production_cycles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('planting', 'fertilizing', 'weeding', 'pest_control', 'irrigation', 'harvesting', 'soil_preparation', 'other'),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      completed_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      labor_hours: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: true,
      },
      labor_type: {
        type: Sequelize.ENUM('hired', 'family', 'cooperative'),
        allowNull: true,
      },
      inputs: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      weather: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'planned',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add activities indexes
    await queryInterface.addIndex('activities', ['user_id'], {
      name: 'activities_user_id_idx',
    });
    await queryInterface.addIndex('activities', ['production_cycle_id'], {
      name: 'activities_production_cycle_id_idx',
    });
    await queryInterface.addIndex('activities', ['scheduled_date'], {
      name: 'activities_scheduled_date_idx',
    });
    await queryInterface.addIndex('activities', ['status'], {
      name: 'activities_status_idx',
    });
    await queryInterface.addIndex('activities', ['type'], {
      name: 'activities_type_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (due to foreign key constraints)
    await queryInterface.dropTable('activities');
    await queryInterface.dropTable('production_cycles');
    await queryInterface.dropTable('crop_varieties');
    await queryInterface.dropTable('users');

    // Drop all enum types
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_activities_labor_type";
      DROP TYPE IF EXISTS "enum_activities_status";
      DROP TYPE IF EXISTS "enum_activities_type";
      DROP TYPE IF EXISTS "enum_production_cycles_status";
      DROP TYPE IF EXISTS "enum_crop_varieties_crop_type";
      DROP TYPE IF EXISTS "enum_users_subscription_type";
    `);
  },
}; 