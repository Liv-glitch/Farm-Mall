'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('soil_tests', {
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
      farm_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'farms',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      document_url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      thumbnail_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      analysis_result: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'analyzed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      ai_model_version: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('soil_tests', ['user_id']);
    await queryInterface.addIndex('soil_tests', ['farm_id']);
    await queryInterface.addIndex('soil_tests', ['status']);
    await queryInterface.addIndex('soil_tests', ['created_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('soil_tests');
  }
}; 