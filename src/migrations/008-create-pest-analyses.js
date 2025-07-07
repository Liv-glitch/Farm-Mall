'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pest_analyses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      production_cycle_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'production_cycles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      image_url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      crop_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      location_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      location_lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      analysis_result: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing',
      },
      ai_model_version: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      processing_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('pest_analyses', ['user_id'], {
      name: 'pest_analyses_user_id_idx',
    });

    await queryInterface.addIndex('pest_analyses', ['production_cycle_id'], {
      name: 'pest_analyses_production_cycle_id_idx',
    });

    await queryInterface.addIndex('pest_analyses', ['created_at'], {
      name: 'pest_analyses_created_at_idx',
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable('pest_analyses');
  }
}; 