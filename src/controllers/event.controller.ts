import { Request, Response } from 'express';
import { EventService } from '../services/event.service';
import { validateEventRequest } from '../utils/validators';
import { HTTP_STATUS } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';

const eventService = new EventService();

export class EventController {
  async getPublicEvents(_req: Request, res: Response): Promise<void> {
    try {
      const events = await eventService.getUpcomingEvents();

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      logError('Failed to get public events', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve events',
      });
    }
  }

  async getAdminEvents(req: Request, res: Response): Promise<void> {
    try {
      const events = await eventService.getAllEvents();

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      logError('Failed to get admin events', error as Error, { userId: req.user?.id });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve events',
      });
    }
  }

  async getAdminEvent(req: Request, res: Response): Promise<void> {
    try {
      const event = await eventService.getEventById(req.params.id);
      if (!event) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      logError('Failed to get admin event', error as Error, {
        userId: req.user?.id,
        eventId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve event',
      });
    }
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateEventRequest(req.body);
      if (!validation.isValid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        });
        return;
      }

      const event = await eventService.createEvent(req.body, req.user?.id);
      logInfo('Event created', { eventId: event.id, userId: req.user?.id });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Event created successfully',
        data: event,
      });
    } catch (error) {
      logError('Failed to create event', error as Error, { userId: req.user?.id, body: req.body });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create event',
      });
    }
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateEventRequest(req.body);
      if (!validation.isValid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        });
        return;
      }

      const event = await eventService.updateEvent(req.params.id, req.body);
      if (!event) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      logInfo('Event updated', { eventId: event.id, userId: req.user?.id });

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event,
      });
    } catch (error) {
      logError('Failed to update event', error as Error, {
        userId: req.user?.id,
        eventId: req.params.id,
        body: req.body,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update event',
      });
    }
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await eventService.deleteEvent(req.params.id);
      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      logInfo('Event deleted', { eventId: req.params.id, userId: req.user?.id });

      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      logError('Failed to delete event', error as Error, {
        userId: req.user?.id,
        eventId: req.params.id,
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to delete event',
      });
    }
  }
}

export const eventController = new EventController();
