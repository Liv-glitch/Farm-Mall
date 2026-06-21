import { Op } from 'sequelize';
import { EventModel } from '../models/Event.model';
import { EventPayload } from '../types/event.types';

export class EventService {
  async getUpcomingEvents(): Promise<EventModel[]> {
    return EventModel.findAll({
      where: {
        date: {
          [Op.gte]: new Date(),
        },
      },
      order: [['date', 'ASC']],
    });
  }

  async getAllEvents(): Promise<EventModel[]> {
    return EventModel.findAll({
      order: [['date', 'ASC']],
    });
  }

  async getEventById(id: string): Promise<EventModel | null> {
    return EventModel.findByPk(id);
  }

  async createEvent(payload: EventPayload, createdBy?: string): Promise<EventModel> {
    return EventModel.create({
      name: payload.name,
      date: new Date(payload.date),
      mode: payload.mode,
      location: payload.mode === 'physical' ? payload.location?.trim() || null : null,
      registrationLink: payload.registrationLink || payload.registration_link || '',
      description: payload.description,
      createdBy,
    });
  }

  async updateEvent(id: string, payload: EventPayload): Promise<EventModel | null> {
    const event = await EventModel.findByPk(id);
    if (!event) {
      return null;
    }

    await event.update({
      name: payload.name,
      date: new Date(payload.date),
      mode: payload.mode,
      location: payload.mode === 'physical' ? payload.location?.trim() || null : null,
      registrationLink: payload.registrationLink || payload.registration_link || '',
      description: payload.description,
    });

    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const deleted = await EventModel.destroy({ where: { id } });
    return deleted > 0;
  }
}
