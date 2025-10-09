'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add new enum values (must be outside transaction due to PostgreSQL limitation)
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_activities_labor_type" ADD VALUE IF NOT EXISTS 'manual-family';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_activities_labor_type" ADD VALUE IF NOT EXISTS 'manual-hired';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_activities_labor_type" ADD VALUE IF NOT EXISTS 'mechanized';`
    );

    // Step 2-6: Everything else can be in a transaction
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Step 2: Update existing data to use new enum values
      await queryInterface.sequelize.query(
        `UPDATE activities SET labor_type = 'manual-family' WHERE labor_type = 'family';`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE activities SET labor_type = 'manual-hired' WHERE labor_type = 'hired';`,
        { transaction }
      );
      // Note: 'cooperative' doesn't have a direct mapping, so we'll map it to 'manual-family'
      await queryInterface.sequelize.query(
        `UPDATE activities SET labor_type = 'manual-family' WHERE labor_type = 'cooperative';`,
        { transaction }
      );

      // Step 3: Create a new enum type with only the new values
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_activities_labor_type_new" AS ENUM('manual-family', 'manual-hired', 'mechanized');`,
        { transaction }
      );

      // Step 4: Alter the column to use the new enum type
      await queryInterface.sequelize.query(
        `ALTER TABLE activities ALTER COLUMN labor_type TYPE "enum_activities_labor_type_new" USING labor_type::text::"enum_activities_labor_type_new";`,
        { transaction }
      );

      // Step 5: Drop the old enum type
      await queryInterface.sequelize.query(
        `DROP TYPE "enum_activities_labor_type";`,
        { transaction }
      );

      // Step 6: Rename the new enum type to the original name
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_activities_labor_type_new" RENAME TO "enum_activities_labor_type";`,
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Step 1: Create old enum type
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_activities_labor_type_old" AS ENUM('hired', 'family', 'cooperative');`,
        { transaction }
      );

      // Step 2: Update data back to old values
      await queryInterface.sequelize.query(
        `UPDATE activities SET labor_type = 'family' WHERE labor_type = 'manual-family';`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE activities SET labor_type = 'hired' WHERE labor_type = 'manual-hired';`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `UPDATE activities SET labor_type = 'cooperative' WHERE labor_type = 'mechanized';`,
        { transaction }
      );

      // Step 3: Alter the column to use the old enum type
      await queryInterface.sequelize.query(
        `ALTER TABLE activities ALTER COLUMN labor_type TYPE "enum_activities_labor_type_old" USING labor_type::text::"enum_activities_labor_type_old";`,
        { transaction }
      );

      // Step 4: Drop the new enum type
      await queryInterface.sequelize.query(
        `DROP TYPE "enum_activities_labor_type";`,
        { transaction }
      );

      // Step 5: Rename the old enum type back to the original name
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_activities_labor_type_old" RENAME TO "enum_activities_labor_type";`,
        { transaction }
      );
    });
  }
};
