import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

export interface CollaboratorPermissions {
  canCreateCycles: boolean;
  canEditCycles: boolean;
  canDeleteCycles: boolean;
  canAssignTasks: boolean;
  canViewFinancials: boolean;
}

interface FarmCollaboratorAttributes {
  id: string;
  farmId: string;
  collaboratorId: string | null;
  inviteEmail?: string;
  invitePhone?: string;
  role: 'viewer' | 'manager' | 'worker' | 'family_member' | 'admin';
  status: 'pending' | 'active' | 'inactive';
  inviteToken?: string;
  inviteExpiresAt?: Date;
  permissions: CollaboratorPermissions;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FarmCollaboratorCreationAttributes extends Optional<FarmCollaboratorAttributes, 'id' | 'createdAt' | 'updatedAt' | 'permissions' | 'inviteExpiresAt'> {}

export class FarmCollaboratorModel extends Model<FarmCollaboratorAttributes, FarmCollaboratorCreationAttributes> implements FarmCollaboratorAttributes {
  public id!: string;
  public farmId!: string;
  public collaboratorId!: string | null;
  public inviteEmail?: string;
  public invitePhone?: string;
  public role!: 'viewer' | 'manager' | 'worker' | 'family_member' | 'admin';
  public status!: 'pending' | 'active' | 'inactive';
  public inviteToken?: string;
  public inviteExpiresAt?: Date;
  public permissions!: CollaboratorPermissions;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Virtual attributes
  public readonly farm?: any;
  public readonly collaborator?: any;

  // Helper methods
  public isActive(): boolean {
    return this.status === 'active';
  }

  public isPending(): boolean {
    return this.status === 'pending';
  }

  public isInactive(): boolean {
    return this.status === 'inactive';
  }

  public isInviteExpired(): boolean {
    if (!this.inviteExpiresAt) return false;
    return new Date() > this.inviteExpiresAt;
  }

  public canManage(): boolean {
    return this.role === 'admin' || this.role === 'manager';
  }

  public canEdit(): boolean {
    return this.permissions.canEditCycles;
  }

  public canView(): boolean {
    return true; // All roles can view
  }

  // Model associations
  public static associate(models: any): void {
    FarmCollaboratorModel.belongsTo(models.Farm, {
      foreignKey: 'farmId',
      as: 'farm',
    });

    FarmCollaboratorModel.belongsTo(models.User, {
      foreignKey: 'collaboratorId',
      as: 'collaborator',
    });
  }

  // Instance methods
  public generateInviteToken(): void {
    this.inviteToken = uuidv4();
    this.inviteExpiresAt = addDays(new Date(), 7); // 7 days expiry
  }

  public getDefaultPermissions(): void {
    const defaultPermissions: CollaboratorPermissions = {
      canCreateCycles: false,
      canEditCycles: false,
      canDeleteCycles: false,
      canAssignTasks: false,
      canViewFinancials: false
    };

    switch (this.role) {
      case 'manager':
      case 'admin':
        this.permissions = {
          ...defaultPermissions,
          canCreateCycles: true,
          canEditCycles: true,
          canDeleteCycles: true,
          canAssignTasks: true,
          canViewFinancials: true
        };
        break;
      case 'worker':
        this.permissions = {
          ...defaultPermissions,
          canAssignTasks: true
        };
        break;
      case 'family_member':
        this.permissions = {
          ...defaultPermissions,
          canCreateCycles: true,
          canEditCycles: true,
          canViewFinancials: true
        };
        break;
      case 'viewer':
      default:
        this.permissions = defaultPermissions;
        break;
    }
  }
}

FarmCollaboratorModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    farmId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'farm_id',
      references: {
        model: 'farms',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    collaboratorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'collaborator_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    inviteEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'invite_email',
    },
    invitePhone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'invite_phone',
    },
    role: {
      type: DataTypes.ENUM('viewer', 'manager', 'worker', 'family_member', 'admin'),
      allowNull: false,
      defaultValue: 'viewer',
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'inactive'),
      allowNull: false,
      defaultValue: 'pending',
    },
    inviteToken: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'invite_token',
    },
    inviteExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'invite_expires_at',
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        canCreateCycles: false,
        canEditCycles: false,
        canDeleteCycles: false,
        canAssignTasks: false,
        canViewFinancials: false
      }
    },
  },
  {
    sequelize,
    tableName: 'farm_collaborators',
    modelName: 'FarmCollaborator',
    timestamps: true,
  }
);

export default FarmCollaboratorModel; 