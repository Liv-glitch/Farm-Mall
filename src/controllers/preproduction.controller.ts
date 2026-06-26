import { Request, Response } from 'express';
import {
  PreproductionService,
  CreatePreproductionPlanRequest,
  UpdatePreproductionTaskRequest,
} from '../services/preproduction.service';
import { ERROR_CODES } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';

const preproductionService = new PreproductionService();

export class PreproductionController {
  // List all pre-production plans for the current user
  async getPlans(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const plans = await preproductionService.getUserPlans(userId);

      res.json({
        success: true,
        data: plans,
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get pre-production plans', err, { userId: req.user?.id });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pre-production plans',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  // Create a new pre-production plan (auto-generates steps + tasks)
  async createPlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const planData: CreatePreproductionPlanRequest = req.body;

      const plan = await preproductionService.createPlan(userId, planData);

      logInfo('Pre-production plan created via API', { userId, planId: plan.id });

      res.status(201).json({
        success: true,
        message: 'Pre-production plan created successfully',
        data: plan,
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to create pre-production plan via API', err, {
        userId: req.user?.id,
        body: req.body,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to create pre-production plan',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  // Get a single pre-production plan with its steps and tasks
  async getPlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const plan = await preproductionService.getPlanById(userId, req.params.id);

      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      const err = error as Error;
      const isNotFound = err.message === ERROR_CODES.NOT_FOUND;
      if (!isNotFound) {
        logError('Failed to get pre-production plan', err, { userId: req.user?.id });
      }
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        message: isNotFound ? 'Pre-production plan not found' : 'Failed to retrieve pre-production plan',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  // Delete a pre-production plan and its generated checklist.
  async deletePlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      await preproductionService.deletePlan(userId, req.params.id);

      logInfo('Pre-production plan deleted via API', { userId, planId: req.params.id });

      res.json({
        success: true,
        message: 'Pre-production plan deleted successfully',
      });
    } catch (error) {
      const err = error as Error;
      const isNotFound = err.message === ERROR_CODES.NOT_FOUND;
      if (!isNotFound) {
        logError('Failed to delete pre-production plan', err, { userId: req.user?.id, planId: req.params.id });
      }
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        message: isNotFound ? 'Pre-production plan not found' : 'Failed to delete pre-production plan',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  // Update a task (mark complete/incomplete, capture date/cost/supplier)
  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const body: UpdatePreproductionTaskRequest = req.body;

      const plan = await preproductionService.updateTask(userId, req.params.id, body);

      res.json({
        success: true,
        message: 'Task updated successfully',
        data: plan,
      });
    } catch (error) {
      const err = error as Error;
      const isNotFound = err.message === ERROR_CODES.NOT_FOUND;
      const isInvalidRequest = err.message === ERROR_CODES.INVALID_REQUEST;
      if (!isNotFound) {
        logError('Failed to update pre-production task', err, { userId: req.user?.id });
      }
      res.status(isNotFound ? 404 : isInvalidRequest ? 400 : 500).json({
        success: false,
        message: isNotFound
          ? 'Task not found'
          : isInvalidRequest
            ? 'Informational activities cannot be marked as done'
            : 'Failed to update task',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
}

const preproductionController = new PreproductionController();
export { preproductionController };
