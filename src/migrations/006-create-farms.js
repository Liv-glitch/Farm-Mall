module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('farms', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      location_lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      location_lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      size_acres: {
        type: Sequelize.DECIMAL(8, 2),
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
    await queryInterface.addIndex('farms', ['owner_id']);
    await queryInterface.addIndex('farms', ['location']);

    // Create default farms for existing users
    const users = await queryInterface.sequelize.query(
      'SELECT id, full_name, county, sub_county FROM users',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      const farms = users.map(user => ({
        id: Sequelize.literal('uuid_generate_v4()'),
        owner_id: user.id,
        name: `${user.full_name}'s Farm`,
        location: `${user.county}, ${user.sub_county}`,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await queryInterface.bulkInsert('farms', farms);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('farms');
  }
}; 