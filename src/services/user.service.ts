import { UserModel } from '../models';
import { User, ChangePasswordRequest } from '../types/auth.types';
import { ERROR_CODES } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';
import bcrypt from 'bcrypt';
import { env } from '../config/environment';

export interface UpdateUserProfileRequest {
  fullName?: string;
  county?: string;
  subCounty?: string;
  profilePictureUrl?: string;
  locationLat?: number;
  locationLng?: number;
}

export interface SubscriptionUpgradeRequest {
  subscriptionType: 'premium';
  paymentMethod: 'mpesa' | 'card';
  amount: number;
  phoneNumber?: string;
}

export class UserService {
  // Get user profile
  async getUserProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const userResponse = user.toJSON() as any;
      delete userResponse.passwordHash;
      
      logInfo('User profile retrieved', { userId });
      return userResponse;
    } catch (error) {
      logError('Failed to get user profile', error as Error, { userId });
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(
    userId: string, 
    updateData: UpdateUserProfileRequest
  ): Promise<Omit<User, 'passwordHash'>> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Update user data
      await user.update(updateData);

      const userResponse = user.toJSON() as any;
      delete userResponse.passwordHash;
      
      logInfo('User profile updated', { userId, updatedFields: Object.keys(updateData) });
      return userResponse;
    } catch (error) {
      logError('Failed to update user profile', error as Error, { userId });
      throw error;
    }
  }

  // Change user password
  async changePassword(userId: string, passwordData: ChangePasswordRequest): Promise<void> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        passwordData.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(passwordData.newPassword, env.BCRYPT_SALT_ROUNDS);

      // Update password
      await user.update({ passwordHash: newPasswordHash });

      logInfo('Password changed successfully', { userId });
    } catch (error) {
      logError('Failed to change password', error as Error, { userId });
      throw error;
    }
  }

  // Upgrade subscription
  async upgradeSubscription(
    userId: string, 
    upgradeData: SubscriptionUpgradeRequest
  ): Promise<{ message: string; subscriptionExpiresAt: Date }> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Calculate subscription expiry (1 year from now)
      const subscriptionExpiresAt = new Date();
      subscriptionExpiresAt.setFullYear(subscriptionExpiresAt.getFullYear() + 1);

      // TODO: Integrate with payment gateway (M-Pesa, Stripe, etc.)
      // For now, we'll simulate successful payment
      
      // Update user subscription
      await user.update({
        subscriptionType: 'premium',
        subscriptionExpiresAt,
      });

      logInfo('Subscription upgraded successfully', { 
        userId, 
        subscriptionType: upgradeData.subscriptionType,
        expiresAt: subscriptionExpiresAt 
      });

      return {
        message: 'Subscription upgraded successfully',
        subscriptionExpiresAt,
      };
    } catch (error) {
      logError('Failed to upgrade subscription', error as Error, { userId });
      throw error;
    }
  }

  // Cancel subscription (downgrade to free)
  async cancelSubscription(userId: string): Promise<{ message: string }> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Downgrade to free subscription
      await user.update({
        subscriptionType: 'free',
        subscriptionExpiresAt: undefined,
      });

      logInfo('Subscription cancelled', { userId });

      return {
        message: 'Subscription cancelled successfully. You now have a free account.',
      };
    } catch (error) {
      logError('Failed to cancel subscription', error as Error, { userId });
      throw error;
    }
  }

  // Get user statistics
  async getUserStatistics(userId: string): Promise<{
    productionCycles: number;
    totalHarvests: number;
    pestAnalyses: number;
    accountAge: number; // days
  }> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // TODO: Implement actual statistics calculation with production cycles
      // For now, return dummy data
      const accountAge = Math.floor(
        (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const stats = {
        productionCycles: 0, // Will be calculated from production cycles
        totalHarvests: 0,    // Will be calculated from completed cycles
        pestAnalyses: 0,     // Will be calculated from pest analysis records
        accountAge,
      };

      logInfo('User statistics retrieved', { userId, stats });
      return stats;
    } catch (error) {
      logError('Failed to get user statistics', error as Error, { userId });
      throw error;
    }
  }

  // Delete user account
  async deleteUserAccount(userId: string): Promise<{ message: string }> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // TODO: Clean up related data (production cycles, pest analyses, etc.)
      
      // Delete user account
      await user.destroy();

      logInfo('User account deleted', { userId });

      return {
        message: 'Account deleted successfully',
      };
    } catch (error) {
      logError('Failed to delete user account', error as Error, { userId });
      throw error;
    }
  }

  // Get users by location (for admin/analytics)
  async getUsersByLocation(county?: string, subCounty?: string): Promise<{
    users: Array<Pick<User, 'id' | 'fullName' | 'county' | 'subCounty' | 'subscriptionType' | 'createdAt'>>;
    total: number;
  }> {
    try {
      const whereClause: any = {};
      
      if (county) {
        whereClause.county = county;
      }
      
      if (subCounty) {
        whereClause.subCounty = subCounty;
      }

      const users = await UserModel.findAll({
        where: whereClause,
        attributes: ['id', 'fullName', 'county', 'subCounty', 'subscriptionType', 'createdAt'],
        order: [['createdAt', 'DESC']],
      });

      logInfo('Users retrieved by location', { county, subCounty, count: users.length });

      return {
        users: users.map(user => user.toJSON()),
        total: users.length,
      };
    } catch (error) {
      logError('Failed to get users by location', error as Error, { county, subCounty });
      throw error;
    }
  }
} 