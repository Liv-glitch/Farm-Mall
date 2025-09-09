import { Router } from 'express';
import { CollaborationController } from '../controllers/collaboration.controller';
import { authenticate, checkFarmAccess, requireFarmOwnership } from '../middleware/auth.middleware';
import { 
  validateInviteCollaborator, 
  validateAcceptInvite, 
  validateCollaboratorRegistration,
  validateUpdatePermissions 
} from '../middleware/validation.middleware';
import { ERROR_CODES } from '../utils/constants';
import { logError } from '../utils/logger';
import { CollaborationService } from '../services/collaboration.service';

const router = Router();
const collaborationController = new CollaborationController();
const collaborationService = new CollaborationService();

/**
 * @swagger
 * /api/v1/collaboration/farms:
 *   get:
 *     summary: Get user's farms
 *     description: Get all farms owned by the user and farms where they are a collaborator
 *     tags: [Farm Collaboration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Farms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Farm'
 */
router.get(
  '/farms',
  authenticate,
  collaborationController.getUserFarms
);

/**
 * @swagger
 * /api/v1/collaboration/farms/{farmId}/invite:
 *   post:
 *     summary: Invite collaborator
 *     description: Invite a new collaborator to a farm by email or phone number
 *     tags: [Farm Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [viewer, manager, worker, family_member]
 */
router.post(
  '/farms/:farmId/invite',
  authenticate,
  requireFarmOwnership,
  validateInviteCollaborator,
  collaborationController.inviteCollaborator
);

/**
 * @swagger
 * /api/v1/collaboration/invites/{token}/accept:
 *   post:
 *     summary: Accept invite (existing user)
 *     description: Accept a collaboration invite for an existing user
 *     tags: [Farm Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.post(
  '/invites/:token/accept',
  authenticate,
  validateAcceptInvite,
  collaborationController.acceptInvite
);


/**
 * @swagger
 * /api/v1/collaboration/invites/{token}/register:
 *   post:
 *     summary: Register and accept invite
 *     description: Register as a new user and accept a collaboration invite
 *     tags: [Farm Collaboration]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - password
 *               - county
 *               - subCounty
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               password:
 *                 type: string
 *               county:
 *                 type: string
 *               subCounty:
 *                 type: string
 */
router.post(
  '/invites/:token/register',
  validateCollaboratorRegistration,
  collaborationController.registerAndAcceptInvite
);

/**
 * @swagger
 * /api/v1/collaboration/farms/{farmId}/collaborators:
 *   get:
 *     summary: Get farm collaborators
 *     description: Get all collaborators for a specific farm
 *     tags: [Farm Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.get(
  '/farms/:farmId/collaborators',
  authenticate,
  checkFarmAccess,
  collaborationController.getFarmCollaborators
);

/**
 * @swagger
 * /api/v1/collaboration/farms/{farmId}/collaborators/{collaborationId}:
 *   delete:
 *     summary: Remove collaborator
 *     description: Remove a collaborator from a farm
 *     tags: [Farm Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: collaborationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.delete(
  '/farms/:farmId/collaborators/:collaborationId',
  authenticate,
  requireFarmOwnership,
  collaborationController.removeCollaborator
);

/**
 * @swagger
 * /api/v1/collaboration/farms/{farmId}/collaborators/{collaborationId}/permissions:
 *   patch:
 *     summary: Update collaborator permissions
 *     description: Update permissions for a farm collaborator
 *     tags: [Farm Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: collaborationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: object
 *                 properties:
 *                   canCreateCycles:
 *                     type: boolean
 *                   canEditCycles:
 *                     type: boolean
 *                   canDeleteCycles:
 *                     type: boolean
 *                   canAssignTasks:
 *                     type: boolean
 *                   canViewFinancials:
 *                     type: boolean
 */
router.patch(
  '/farms/:farmId/collaborators/:collaborationId/permissions',
  authenticate,
  requireFarmOwnership,
  validateUpdatePermissions,
  collaborationController.updateCollaboratorPermissions
);

/**
 * @swagger
 * /api/v1/collaboration/farms/{farmId}/collaborators/{collaborationId}/role:
 *   patch:
 *     summary: Update collaborator role
 *     description: Update role for a farm collaborator
 *     tags: [Farm Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: collaborationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, manager, worker, family_member]
 */
router.patch(
  '/farms/:farmId/collaborators/:collaborationId/role',
  authenticate,
  requireFarmOwnership,
  async (req, res) => {
    try {
      const { farmId, collaborationId } = req.params;
      const { role } = req.body;

      if (!farmId || !collaborationId) {
        res.status(400).json({ error: ERROR_CODES.INVALID_INPUT_FORMAT });
        return;
      }

      await collaborationService.updateCollaboratorPermissions(farmId, collaborationId, { role });
      res.status(200).json({ message: 'Collaborator role updated successfully' });
    } catch (error) {
      logError('Failed to update collaborator role', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

export default router; 