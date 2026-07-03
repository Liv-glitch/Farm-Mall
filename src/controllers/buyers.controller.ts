import { Request, Response } from 'express';
import {
  BuyersMarketplaceError,
  buyersMarketplaceService,
} from '../services/buyersMarketplace.service';
import { MarketplaceDecision } from '../types/buyers.types';
import { logError } from '../utils/logger';

export class BuyersController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const data = await buyersMarketplaceService.getDashboard(req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      this.handleError(res, error, 'Failed to get buyers dashboard');
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const data = await buyersMarketplaceService.register(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Marketplace registration submitted successfully',
        data,
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to register for buyers marketplace');
    }
  }

  async getBookings(req: Request, res: Response): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const data = await buyersMarketplaceService.getBookings(req.user!.id, status);
      res.json({ success: true, data });
    } catch (error) {
      this.handleError(res, error, 'Failed to get buyer bookings');
    }
  }

  async decideBooking(req: Request, res: Response): Promise<void> {
    try {
      const { bookingRef } = req.params;
      const decision = req.body?.decision as MarketplaceDecision;
      const data = await buyersMarketplaceService.decideBooking(req.user!.id, bookingRef, decision);
      res.json({
        success: true,
        message: decision === 'approve' ? 'Booking approved' : 'Booking rejected',
        data,
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to update buyer booking');
    }
  }

  async callback(req: Request, res: Response): Promise<void> {
    try {
      buyersMarketplaceService.validateCallbackToken(
        req.headers['x-marketplace-callback-token'] || req.headers['x-callback-token'],
        req.query.token
      );
      const data = await buyersMarketplaceService.recordCallback(req.body);
      res.json({ success: true, data });
    } catch (error) {
      this.handleError(res, error, 'Failed to record buyer marketplace callback');
    }
  }

  private handleError(res: Response, error: unknown, fallbackMessage: string) {
    if (error instanceof BuyersMarketplaceError) {
      res.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
      });
      return;
    }

    logError(fallbackMessage, error as Error);
    res.status(500).json({
      success: false,
      code: 'internal_server_error',
      message: fallbackMessage,
    });
  }
}

export const buyersController = new BuyersController();
