import { Request, Response } from 'express';
import { CollaborationService } from '../services/collaboration.service';
import { ERROR_CODES } from '../utils/constants';
import { logError } from '../utils/logger';

const collaborationService = new CollaborationService();

export class CollaborationController {
  // Get all farms (both owned and collaborated)
  async getUserFarms(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED });
        return;
      }

      const farms = await collaborationService.getUserFarms(userId);
      res.status(200).json(farms);
    } catch (error) {
      logError('Failed to get user farms', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Invite a new collaborator
  async inviteCollaborator(req: Request, res: Response): Promise<void> {
    try {
      const { farmId } = req.params;
      const { email, phoneNumber, role } = req.body;

      if (!farmId) {
        res.status(400).json({ error: ERROR_CODES.INVALID_INVITE_DATA });
        return;
      }

      await collaborationService.inviteCollaborator(farmId, {
        email,
        phoneNumber,
        role
      });

      res.status(201).json({ message: 'Collaboration invitation sent successfully' });
    } catch (error) {
      logError('Failed to invite collaborator', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Accept collaboration invite (for existing users)
  async acceptInvite(req: Request, res: Response): Promise<void> {
    try {
      const { inviteToken } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED });
        return;
      }

      await collaborationService.acceptInvite(inviteToken, userId);
      res.status(200).json({ message: 'Collaboration invite accepted successfully' });
    } catch (error) {
      logError('Failed to accept collaboration invite', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }


  // Register new user and accept invite
  async registerAndAcceptInvite(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { fullName, email, phoneNumber, password, county, subCounty } = req.body;

      const user = await collaborationService.registerAndAcceptInvite(token, {
        fullName,
        email,
        phoneNumber,
        password,
        county,
        subCounty
      });

      res.status(201).json({ message: 'Registration successful', user });
    } catch (error) {
      logError('Failed to register and accept invite', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Get collaborators for a farm
  async getFarmCollaborators(req: Request, res: Response): Promise<void> {
    try {
      const { farmId } = req.params;

      if (!farmId) {
        res.status(400).json({ error: ERROR_CODES.FARM_NOT_FOUND });
        return;
      }

      const collaborators = await collaborationService.getFarmCollaborators(farmId);
      res.status(200).json(collaborators);
    } catch (error) {
      logError('Failed to get farm collaborators', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Remove collaborator from farm
  async removeCollaborator(req: Request, res: Response): Promise<void> {
    try {
      const { farmId, collaborationId } = req.params;

      if (!farmId || !collaborationId) {
        res.status(400).json({ error: ERROR_CODES.INVALID_INPUT_FORMAT });
        return;
      }

      await collaborationService.removeCollaborator(farmId, collaborationId);
      res.status(200).json({ message: 'Collaborator removed successfully' });
    } catch (error) {
      logError('Failed to remove collaborator', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Update collaborator permissions and role
  async updateCollaboratorPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { farmId, collaborationId } = req.params;
      const { permissions, role } = req.body;

      if (!farmId || !collaborationId) {
        res.status(400).json({ error: ERROR_CODES.INVALID_INPUT_FORMAT });
        return;
      }

      await collaborationService.updateCollaboratorPermissions(farmId, collaborationId, { permissions, role });
      res.status(200).json({ message: 'Collaborator updated successfully' });
    } catch (error) {
      logError('Failed to update collaborator', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }
} 