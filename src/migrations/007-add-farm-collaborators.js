module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('farm_collaborators', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      farm_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'farms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      collaborator_id: {
        type: Sequelize.UUID,
        allowNull: true, // Null until account is linked
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      invite_email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      invite_phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('manager', 'worker', 'family_member', 'viewer'),
        allowNull: false
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'blocked'),
        allowNull: false,
        defaultValue: 'pending'
      },
      invite_token: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      invite_expires_at: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('farm_collaborators', ['farm_id']);
    await queryInterface.addIndex('farm_collaborators', ['collaborator_id']);
    await queryInterface.addIndex('farm_collaborators', ['invite_email']);
    await queryInterface.addIndex('farm_collaborators', ['invite_phone']);
    await queryInterface.addIndex('farm_collaborators', ['status']);
    await queryInterface.addIndex('farm_collaborators', ['invite_token']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('farm_collaborators');
  }
}; 