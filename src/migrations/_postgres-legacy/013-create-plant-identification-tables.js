module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create plant_identifications table
    await queryInterface.createTable('plant_identifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      image_url: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      thumbnail_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      original_filename: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      identification_result: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    // Create plant_health_assessments table
    await queryInterface.createTable('plant_health_assessments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      image_url: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      thumbnail_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      original_filename: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      health_assessment_result: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_healthy: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      diseases: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      treatment_suggestions: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    });

    // Add indexes
    await queryInterface.addIndex('plant_identifications', ['user_id']);
    await queryInterface.addIndex('plant_identifications', ['created_at']);
    await queryInterface.addIndex('plant_identifications', ['confidence_score']);

    await queryInterface.addIndex('plant_health_assessments', ['user_id']);
    await queryInterface.addIndex('plant_health_assessments', ['created_at']);
    await queryInterface.addIndex('plant_health_assessments', ['is_healthy']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('plant_health_assessments');
    await queryInterface.dropTable('plant_identifications');
  }
}; 