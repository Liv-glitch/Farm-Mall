export type EventMode = 'online' | 'physical';

export interface Event {
  id: string;
  name: string;
  date: Date;
  mode: EventMode;
  location?: string | null;
  registrationLink: string;
  description: string;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventPayload {
  name: string;
  date: Date | string;
  mode: EventMode;
  location?: string | null;
  registration_link?: string;
  registrationLink?: string;
  description: string;
}
