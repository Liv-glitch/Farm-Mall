module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns exist first
    const tableInfo = await queryInterface.describeTable('farm_collaborators');

    // Add invite_expires_at column if it doesn't exist
    if (!tableInfo.invite_expires_at) {
      await queryInterface.addColumn('farm_collaborators', 'invite_expires_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // Add permissions column if it doesn't exist
    if (!tableInfo.permissions) {
      await queryInterface.addColumn('farm_collaborators', 'permissions', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          canCreateCycles: false,
          canEditCycles: false,
          canDeleteCycles: false,
          canAssignTasks: false,
          canViewFinancials: false
        }
      });
    }

    // Update ENUM type for role
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t 
                      JOIN pg_enum e ON t.oid = e.enumtypid 
                      WHERE t.typname = 'enum_farm_collaborators_role' 
                      AND e.enumlabel = 'worker') THEN
          ALTER TYPE "enum_farm_collaborators_role" ADD VALUE 'worker';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type t 
                      JOIN pg_enum e ON t.oid = e.enumtypid 
                      WHERE t.typname = 'enum_farm_collaborators_role' 
                      AND e.enumlabel = 'family_member') THEN
          ALTER TYPE "enum_farm_collaborators_role" ADD VALUE 'family_member';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type t 
                      JOIN pg_enum e ON t.oid = e.enumtypid 
                      WHERE t.typname = 'enum_farm_collaborators_role' 
                      AND e.enumlabel = 'admin') THEN
          ALTER TYPE "enum_farm_collaborators_role" ADD VALUE 'admin';
        END IF;
      END $$;
    `);

    // Update existing collaborators with default permissions based on role
    await queryInterface.sequelize.query(`
      UPDATE farm_collaborators
      SET permissions = CASE
        WHEN role = 'manager' OR role = 'admin' THEN
          '{"canCreateCycles": true, "canEditCycles": true, "canDeleteCycles": true, "canAssignTasks": true, "canViewFinancials": true}'::jsonb
        WHEN role = 'worker' THEN
          '{"canCreateCycles": false, "canEditCycles": false, "canDeleteCycles": false, "canAssignTasks": true, "canViewFinancials": false}'::jsonb
        WHEN role = 'family_member' THEN
          '{"canCreateCycles": true, "canEditCycles": true, "canDeleteCycles": false, "canAssignTasks": false, "canViewFinancials": true}'::jsonb
        ELSE
          '{"canCreateCycles": false, "canEditCycles": false, "canDeleteCycles": false, "canAssignTasks": false, "canViewFinancials": false}'::jsonb
      END
      WHERE permissions IS NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns
    await queryInterface.removeColumn('farm_collaborators', 'invite_expires_at');
    await queryInterface.removeColumn('farm_collaborators', 'permissions');

    // Note: We cannot remove ENUM values in PostgreSQL, so we'll leave them
  }
}; 