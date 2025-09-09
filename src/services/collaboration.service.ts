import { UserModel } from '../models/User.model';
import { FarmModel } from '../models/Farm.model';
import { FarmCollaboratorModel } from '../models/FarmCollaborator.model';
import { NotificationService, PushNotificationRequest, EmailNotificationRequest, SMSNotificationRequest } from './notification.service';
import { ERROR_CODES } from '../utils/constants';
import { validateKenyaPhoneNumber } from '../utils/validators';
import { logError } from '../utils/logger';
import { User } from '../types/auth.types';
import { CollaboratorPermissions } from '../models/FarmCollaborator.model';
import bcrypt from 'bcrypt';

interface CollaboratorInviteData {
  email?: string;
  phoneNumber?: string;
  role: 'manager' | 'worker' | 'family_member' | 'viewer';
}

interface CollaboratorRegistrationData {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  password: string;
  county: string;
  subCounty: string;
}

export class CollaborationService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Get user's farms (both owned and collaborated)
  async getUserFarms(userId: string): Promise<any[]> {
    try {
      // Get farms owned by user
      const ownedFarms = await FarmModel.findAll({
        where: { ownerId: userId }
      });

      // Get farms where user is a collaborator
      const collaborations = await FarmCollaboratorModel.findAll({
        where: { 
          collaboratorId: userId,
          status: 'active'
        },
        include: [{
          model: FarmModel,
          as: 'farm'
        }]
      });

      const collaboratedFarms = collaborations.map(collab => collab.get('farm'));

      return [...ownedFarms, ...collaboratedFarms];
    } catch (error) {
      logError('Failed to get user farms', error as Error);
      throw error;
    }
  }

  // Type guard for user ID
  private hasValidId(user: UserModel | null): user is UserModel & { id: string } {
    return user !== null && typeof user.id === 'string' && user.id.length > 0;
  }

  // Helper function to create push notification
  private createPushNotification(
    userId: string,
    message: string,
    data: Record<string, unknown>
  ): PushNotificationRequest {
    return {
      type: 'push',
      userId,
      recipient: userId, // For push notifications, recipient is the same as userId
      message,
      data
    };
  }

  // Helper method to handle contact information
  private async handleContactInfo(
    collaborator: FarmCollaboratorModel,
    inviteData: CollaboratorInviteData,
    existingUser: UserModel | null,
    farmName: string
  ): Promise<void> {
    const notificationData = {
      farmId: collaborator.farmId,
      inviteToken: collaborator.inviteToken
    };

    // Send push notification to existing user
    if (this.hasValidId(existingUser)) {
      const notification = this.createPushNotification(
        existingUser.id,
        `You've been invited to collaborate on ${farmName} as a ${inviteData.role}`,
        notificationData
      );
      await this.notificationService.sendNotification(notification);
    }

    // Build smart invitation URL with user info
    const inviteUrl = this.buildInvitationUrl(collaborator.inviteToken!, {
      email: inviteData.email,
      phone: inviteData.phoneNumber,
      role: inviteData.role,
      farmName,
      isExistingUser: !!existingUser,
      userName: existingUser?.fullName
    });

    // Send email notification if email is provided
    if (inviteData.email) {
      const emailContent = this.createInvitationEmailContent(
        farmName,
        inviteData.role,
        inviteUrl,
        !!existingUser,
        existingUser?.fullName
      );

      const notification = this.createEmailNotification(
        inviteData.email,
        'Farm Collaboration Invitation',
        emailContent,
        notificationData
      );
      await this.notificationService.sendNotification(notification);
    }

    // Send SMS notification if phone number is provided
    if (inviteData.phoneNumber) {
      const smsContent = existingUser 
        ? `Hi ${existingUser.fullName}! You've been invited to collaborate on ${farmName} as a ${inviteData.role}. Visit ${inviteUrl} to accept.`
        : `You've been invited to collaborate on ${farmName} as a ${inviteData.role}. Visit ${inviteUrl} to join.`;

      const notification = this.createSMSNotification(
        inviteData.phoneNumber,
        smsContent,
        notificationData
      );
      await this.notificationService.sendNotification(notification);
    }
  }

  // Build smart invitation URL with encoded user info
  private buildInvitationUrl(token: string, info: {
    email?: string;
    phone?: string;
    role: string;
    farmName: string;
    isExistingUser: boolean;
    userName?: string;
  }): string {
    const params = new URLSearchParams({
      role: info.role,
      farm: info.farmName,
      existing: info.isExistingUser.toString(),
      ...(info.email && { email: info.email }),
      ...(info.phone && { phone: info.phone }),
      ...(info.userName && { name: info.userName })
    });

    return `${process.env.FRONTEND_URL}/collaborate/accept/${token}?${params.toString()}`;
  }

  // Create rich email content based on user status
  private createInvitationEmailContent(
    farmName: string,
    role: string,
    inviteUrl: string,
    isExistingUser: boolean,
    userName?: string
  ): string {
    if (isExistingUser) {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E7D32;">Farm Collaboration Invitation</h2>
          <p>Hi ${userName}!</p>
          <p>You've been invited to collaborate on <strong>${farmName}</strong> as a <strong>${role}</strong>.</p>
          <p>Since you already have an account with FarmMall, you can accept this invitation directly.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        </div>
      `;
    } else {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E7D32;">Welcome to FarmMall!</h2>
          <p>You've been invited to collaborate on <strong>${farmName}</strong> as a <strong>${role}</strong>.</p>
          <p>To get started, you'll need to create your FarmMall account and accept the invitation.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Join & Accept Invitation</a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        </div>
      `;
    }
  }

  // Invite collaborator to a farm
  async inviteCollaborator(farmId: string, inviteData: CollaboratorInviteData): Promise<void> {
    try {
      // Verify farm exists and user is owner
      const farm = await FarmModel.findByPk(farmId);
      if (!farm) {
        throw new Error(ERROR_CODES.FARM_NOT_FOUND);
      }

      // Check if email/phone is provided
      if (!inviteData.email && !inviteData.phoneNumber) {
        throw new Error(ERROR_CODES.INVALID_INVITE_DATA);
      }

      // Validate phone number if provided
      if (inviteData.phoneNumber && !validateKenyaPhoneNumber(inviteData.phoneNumber)) {
        throw new Error(ERROR_CODES.INVALID_PHONE_NUMBER);
      }

      // Check if user already exists
      const existingUser = await UserModel.findOne({
        where: {
          ...(inviteData.email ? { email: inviteData.email } : {}),
          ...(inviteData.phoneNumber ? { phoneNumber: inviteData.phoneNumber } : {})
        }
      });

      // Create collaboration record
      const collaborator = await FarmCollaboratorModel.create({
        farmId,
        collaboratorId: this.hasValidId(existingUser) ? existingUser.id : null,
        inviteEmail: inviteData.email,
        invitePhone: inviteData.phoneNumber,
        role: inviteData.role,
        status: 'pending'
      });

      // Generate invite token
      collaborator.generateInviteToken();
      collaborator.getDefaultPermissions();
      await collaborator.save();

      // Handle notifications and contact information
      await this.handleContactInfo(collaborator, inviteData, existingUser, farm.name);
    } catch (error) {
      logError('Failed to invite collaborator', error as Error);
      throw error;
    }
  }

  // Accept collaboration invite (for existing users)
  async acceptInvite(inviteToken: string, userId: string): Promise<void> {
    try {
      const collaboration = await FarmCollaboratorModel.findOne({
        where: { inviteToken }
      });

      if (!collaboration || collaboration.isInviteExpired()) {
        throw new Error(ERROR_CODES.INVALID_INVITE_TOKEN);
      }

      // Update collaboration status
      await collaboration.update({
        collaboratorId: userId,
        status: 'active',
        inviteToken: undefined,
        inviteExpiresAt: undefined
      });

      // Send notification to farm owner
      const farm = await FarmModel.findByPk(collaboration.farmId);
      if (!farm) {
        throw new Error(ERROR_CODES.FARM_NOT_FOUND);
      }

      const ownerNotification: PushNotificationRequest = {
        userId: farm.ownerId,
        type: 'push',
        recipient: farm.ownerId,
        message: `A collaborator has accepted your invitation to join your farm`,
        data: {
          farmId: farm.id,
          collaboratorId: userId
        }
      };
      await this.notificationService.sendNotification(ownerNotification);
    } catch (error) {
      logError('Failed to accept collaboration invite', error as Error);
      throw error;
    }
  }


  // Register and accept invite (for new users)
  async registerAndAcceptInvite(inviteToken: string, userData: CollaboratorRegistrationData): Promise<User> {
    try {
      const collaboration = await FarmCollaboratorModel.findOne({
        where: { inviteToken }
      });

      if (!collaboration || collaboration.isInviteExpired()) {
        throw new Error(ERROR_CODES.INVALID_INVITE_TOKEN);
      }

      // Create new user
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const user = await UserModel.create({
        ...userData,
        role: 'user',
        passwordHash,
        subscriptionType: 'free',
        emailVerified: false,
        phoneVerified: false
      });

      // Update collaboration status
      await collaboration.update({
        collaboratorId: user.id,
        status: 'active',
        inviteToken: undefined,
        inviteExpiresAt: undefined
      });

      // Send notification to farm owner
      const farm = await FarmModel.findByPk(collaboration.farmId);
      if (!farm) {
        throw new Error(ERROR_CODES.FARM_NOT_FOUND);
      }

      const ownerNotification: PushNotificationRequest = {
        userId: farm.ownerId,
        type: 'push',
        recipient: farm.ownerId,
        message: `A new collaborator has registered and joined your farm`,
        data: {
          farmId: farm.id,
          collaboratorId: user.id
        }
      };
      await this.notificationService.sendNotification(ownerNotification);

      return user;
    } catch (error) {
      logError('Failed to register and accept invite', error as Error);
      throw error;
    }
  }

  // Get farm collaborators
  async getFarmCollaborators(farmId: string): Promise<FarmCollaboratorModel[]> {
    try {
      return await FarmCollaboratorModel.findAll({
        where: {
          farmId,
          status: ['active', 'pending'] // Only return active and pending collaborators
        },
        include: [{
          model: UserModel,
          as: 'collaborator',
          attributes: ['id', 'fullName', 'email', 'phoneNumber', 'profilePictureUrl']
        }]
      });
    } catch (error) {
      logError('Failed to get farm collaborators', error as Error);
      throw error;
    }
  }

  // Helper function to create email notification
  private createEmailNotification(
    email: string,
    subject: string,
    message: string,
    data: Record<string, unknown>
  ): EmailNotificationRequest {
    return {
      type: 'email',
      recipient: email,
      subject,
      message,
      data
    };
  }

  // Helper function to create SMS notification
  private createSMSNotification(
    phoneNumber: string,
    message: string,
    data: Record<string, unknown>
  ): SMSNotificationRequest {
    return {
      type: 'sms',
      recipient: phoneNumber,
      message,
      data
    };
  }

  // Remove collaborator
  async removeCollaborator(farmId: string, collaborationId: string): Promise<void> {
    try {
      // First check if the collaborator exists at all
      const collaboration = await FarmCollaboratorModel.findOne({
        where: {
          farmId,
          id: collaborationId
        }
      });

      if (!collaboration) {
        throw new Error(ERROR_CODES.COLLABORATOR_NOT_FOUND);
      }

      // If already inactive, just return successfully
      if (collaboration.status === 'inactive') {
        return;
      }

      // Update to inactive
      await collaboration.update({ status: 'inactive' });

      // Get user's contact info if they have accepted the invite
      if (collaboration.collaboratorId) {
        const user = await UserModel.findByPk(collaboration.collaboratorId);
        if (!user) {
          throw new Error(ERROR_CODES.USER_NOT_FOUND);
        }

        // Type guard for email
        const hasValidEmail = (user: UserModel): user is UserModel & { email: string } => {
          return typeof user.email === 'string' && user.email.length > 0;
        };

        // Type guard for phone number
        const hasValidPhone = (user: UserModel): user is UserModel & { phoneNumber: string } => {
          return typeof user.phoneNumber === 'string' && user.phoneNumber.length > 0;
        };

        // Prepare notification data
        const notificationData = { farmId };

        // Try to send email first, then fall back to SMS
        if (hasValidEmail(user)) {
          const emailMessage = `<h2>Farm Collaboration Update</h2>
<p>You have been removed from a farm collaboration.</p>
<p>Farm ID: ${farmId}</p>`;

          const notification = this.createEmailNotification(
            user.email,
            'Farm Collaboration Update',
            emailMessage,
            notificationData
          );

          await this.notificationService.sendNotification(notification);
        } else if (hasValidPhone(user)) {
          const smsMessage = 'You have been removed from a farm collaboration.';

          const notification = this.createSMSNotification(
            user.phoneNumber,
            smsMessage,
            notificationData
          );

          await this.notificationService.sendNotification(notification);
        } else {
          logError(
            'Could not send removal notification - no valid contact method',
            new Error(ERROR_CODES.MISSING_REQUIRED_FIELD),
            { userId: user.id, farmId }
          );
        }
      } else if (collaboration.inviteEmail || collaboration.invitePhone) {
        // For pending invites, send cancellation notification
        const notificationData = { farmId };

        if (collaboration.inviteEmail) {
          const emailMessage = `<h2>Farm Collaboration Update</h2>
<p>The invitation to collaborate on a farm has been cancelled.</p>
<p>Farm ID: ${farmId}</p>`;

          const notification = this.createEmailNotification(
            collaboration.inviteEmail,
            'Farm Collaboration Update',
            emailMessage,
            notificationData
          );

          await this.notificationService.sendNotification(notification);
        } else if (collaboration.invitePhone) {
          const smsMessage = 'The invitation to collaborate on a farm has been cancelled.';

          const notification = this.createSMSNotification(
            collaboration.invitePhone,
            smsMessage,
            notificationData
          );

          await this.notificationService.sendNotification(notification);
        }
      }
    } catch (error) {
      logError('Failed to remove collaborator', error as Error);
      throw error;
    }
  }

  // Update collaborator permissions and role
  async updateCollaboratorPermissions(
    farmId: string,
    collaborationId: string,
    data: { permissions?: CollaboratorPermissions; role?: 'viewer' | 'manager' | 'worker' | 'family_member' }
  ): Promise<void> {
    try {
      const collaboration = await FarmCollaboratorModel.findOne({
        where: {
          farmId,
          id: collaborationId,
          status: 'active'
        }
      });

      if (!collaboration) {
        throw new Error(ERROR_CODES.COLLABORATOR_NOT_FOUND);
      }

      // If role is provided, update role and set default permissions
      if (data.role) {
        collaboration.role = data.role;
        collaboration.getDefaultPermissions();
      }
      
      // If custom permissions are provided, override defaults
      if (data.permissions) {
        collaboration.permissions = data.permissions;
      }

      // Save changes
      await collaboration.save();

      // Send notification to collaborator if they have accepted the invite
      if (collaboration.collaboratorId) {
        const user = await UserModel.findByPk(collaboration.collaboratorId);
        if (this.hasValidId(user)) {
          const message = data.role 
            ? `Your farm collaboration role has been updated to ${data.role}`
            : 'Your farm collaboration permissions have been updated';

          const notification = this.createPushNotification(
            user.id,
            message,
            { 
              farmId,
              role: collaboration.role,
              permissions: collaboration.permissions 
            }
          );
          await this.notificationService.sendNotification(notification);
        }
      }
    } catch (error) {
      logError('Failed to update collaborator', error as Error);
      throw error;
    }
  }
} 