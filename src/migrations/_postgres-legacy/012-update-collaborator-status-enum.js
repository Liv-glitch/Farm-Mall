'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the default value first
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status DROP DEFAULT;
    `);

    // Convert to varchar temporarily
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status TYPE VARCHAR(255);
    `);

    // Drop and recreate the enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_farm_collaborators_status;
      CREATE TYPE enum_farm_collaborators_status AS ENUM ('pending', 'active', 'inactive');
    `);

    // Convert back to enum with the CASE statement
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status TYPE enum_farm_collaborators_status 
      USING (
        CASE 
          WHEN status = 'pending' THEN 'pending'::enum_farm_collaborators_status
          WHEN status = 'active' THEN 'active'::enum_farm_collaborators_status
          ELSE 'pending'::enum_farm_collaborators_status
        END
      );
    `);

    // Set the default value back
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status SET DEFAULT 'pending';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the default value first
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status DROP DEFAULT;
    `);

    // Update any inactive values to pending
    await queryInterface.sequelize.query(`
      UPDATE farm_collaborators 
      SET status = 'pending' 
      WHERE status = 'inactive';
    `);

    // Convert to varchar temporarily
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status TYPE VARCHAR(255);
    `);

    // Drop and recreate the original enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_farm_collaborators_status;
      CREATE TYPE enum_farm_collaborators_status AS ENUM ('pending', 'active');
    `);

    // Convert back to enum
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status TYPE enum_farm_collaborators_status 
      USING status::enum_farm_collaborators_status;
    `);

    // Set the default value back
    await queryInterface.sequelize.query(`
      ALTER TABLE farm_collaborators 
      ALTER COLUMN status SET DEFAULT 'pending';
    `);
  }
}; 