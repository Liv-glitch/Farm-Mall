'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Plans
    await queryInterface.createTable('preproduction_plans', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      planting_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      potato_variety: {
        type: Sequelize.ENUM('Shangi', 'Sherekea', 'Unica', 'Markies'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('not_started', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'not_started',
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

    await queryInterface.addIndex('preproduction_plans', ['user_id']);
    await queryInterface.addIndex('preproduction_plans', ['status']);

    // Steps
    await queryInterface.createTable('preproduction_steps', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'preproduction_plans',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      date_range_start: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_range_end: {
        type: Sequelize.DATEONLY,
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

    await queryInterface.addIndex('preproduction_steps', ['plan_id']);

    // Tasks
    await queryInterface.createTable('preproduction_tasks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      step_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'preproduction_steps',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      what_you_need: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      what_you_need_link: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expert_tip: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      date_completed: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      cost: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      supplier: {
        type: Sequelize.STRING(255),
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

    await queryInterface.addIndex('preproduction_tasks', ['step_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('preproduction_tasks');
    await queryInterface.dropTable('preproduction_steps');
    await queryInterface.dropTable('preproduction_plans');
  },
};
