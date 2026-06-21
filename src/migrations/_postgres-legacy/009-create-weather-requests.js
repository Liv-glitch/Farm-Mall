'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('weather_requests', {
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
      location_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false,
      },
      location_lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false,
      },
      request_type: {
        type: Sequelize.ENUM('current', 'forecast', 'historical'),
        allowNull: false,
      },
      response_data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('weather_requests', ['user_id'], {
      name: 'weather_requests_user_id_idx',
    });

    await queryInterface.addIndex('weather_requests', ['created_at'], {
      name: 'weather_requests_created_at_idx',
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable('weather_requests');
  }
}; 