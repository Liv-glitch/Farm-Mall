import { ERROR_CODES } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';

export interface BaseNotificationRequest {
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  recipient?: string; // email address, phone number, or device token
  message: string;
  data?: any; // Additional data
  userId?: string; // Optional user ID for all notification types
}

export interface EmailNotificationRequest extends BaseNotificationRequest {
  type: 'email';
  recipient: string; // Required for email
  subject: string;
}

export interface SMSNotificationRequest extends BaseNotificationRequest {
  type: 'sms';
  recipient: string; // Required for SMS
}

export interface PushNotificationRequest extends BaseNotificationRequest {
  type: 'push';
  recipient: string; // Required for push
}

export interface WhatsAppNotificationRequest extends BaseNotificationRequest {
  type: 'whatsapp';
  recipient: string; // Required for WhatsApp
}

export type NotificationRequest = 
  | EmailNotificationRequest 
  | SMSNotificationRequest 
  | PushNotificationRequest 
  | WhatsAppNotificationRequest;

export interface WhatsAppMessage {
  to: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio' | 'video';
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class NotificationService {
  // Send WhatsApp message
  async sendWhatsAppMessage(message: WhatsAppMessage): Promise<{ messageId: string; status: string }> {
    try {
      // TODO: Integrate with WhatsApp Business API
      // - Twilio WhatsApp API
      // - Meta WhatsApp Business API
      // - 360Dialog API
      
      logInfo('WhatsApp message sending started', { to: message.to });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock successful response
      const result = {
        messageId: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
      };

      logInfo('WhatsApp message sent successfully', { 
        to: message.to, 
        messageId: result.messageId 
      });

      return result;
    } catch (error) {
      logError('WhatsApp message sending failed', error as Error, message);
      throw new Error(ERROR_CODES.WHATSAPP_SERVICE_ERROR);
    }
  }

  // Send email
  async sendEmail(email: EmailMessage): Promise<{ messageId: string; status: string }> {
    try {
      // TODO: Integrate with email service
      // - SendGrid
      // - AWS SES
      // - Mailgun
      // - Nodemailer with SMTP
      
      logInfo('Email sending started', { to: email.to, subject: email.subject });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = {
        messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
      };

      logInfo('Email sent successfully', { 
        to: email.to, 
        messageId: result.messageId 
      });

      return result;
    } catch (error) {
      logError('Email sending failed', error as Error, email);
      throw new Error(ERROR_CODES.EMAIL_SENDING_FAILED);
    }
  }

  // Send SMS
  async sendSMS(to: string, message: string): Promise<{ messageId: string; status: string }> {
    try {
      // TODO: Integrate with SMS service
      // - Twilio
      // - AWS SNS
      // - Africa's Talking (for Kenya)
      
      logInfo('SMS sending started', { to });

      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 800));

      const result = {
        messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
      };

      logInfo('SMS sent successfully', { to, messageId: result.messageId });

      return result;
    } catch (error) {
      logError('SMS sending failed', error as Error, { to, message });
      throw new Error(ERROR_CODES.SMS_SENDING_FAILED);
    }
  }

  // Send notification (unified method)
  async sendNotification(request: NotificationRequest): Promise<{ messageId: string; status: string }> {
    try {
      if (!request.recipient) {
        throw new Error(ERROR_CODES.MISSING_REQUIRED_FIELD);
      }

      switch (request.type) {
        case 'whatsapp':
          return await this.sendWhatsAppMessage({
            to: request.recipient,
            message: request.message,
          });

        case 'email':
          return await this.sendEmail({
            to: request.recipient,
            subject: request.subject || 'Agriculture Management Notification',
            html: request.message,
            text: request.message.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          });

        case 'sms':
          return await this.sendSMS(request.recipient, request.message);

        case 'push':
          return await this.sendPushNotification(request.recipient, request.message, request.data);

        default:
          throw new Error('Unsupported notification type');
      }
    } catch (error) {
      logError('Notification sending failed', error as Error, request);
      throw error;
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(requests: NotificationRequest[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ request: NotificationRequest; result?: any; error?: string }>;
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const request of requests) {
      try {
        const result = await this.sendNotification(request);
        results.push({ request, result });
        successful++;
      } catch (error) {
        results.push({ request, error: (error as Error).message });
        failed++;
      }
    }

    logInfo('Bulk notifications completed', { 
      total: requests.length, 
      successful, 
      failed 
    });

    return { successful, failed, results };
  }

  // Send weather alert
  async sendWeatherAlert(
    userId: string,
    recipient: string,
    alertType: 'rain' | 'drought' | 'frost' | 'storm',
    location: string,
    urgency: 'low' | 'medium' | 'high'
  ): Promise<void> {
    try {
      const messages = {
        rain: `🌧️ Weather Alert: Heavy rainfall expected in ${location}. Consider protecting your crops and ensure proper drainage.`,
        drought: `☀️ Weather Alert: Extended dry period forecasted for ${location}. Plan irrigation and water conservation measures.`,
        frost: `❄️ Weather Alert: Frost warning for ${location}. Protect sensitive crops and consider covering plants.`,
        storm: `⛈️ Weather Alert: Storm warning for ${location}. Secure farm equipment and protect crops from wind damage.`,
      };

      const message = messages[alertType];
      const urgencyEmoji = {
        low: '⚪',
        medium: '🟡',
        high: '🔴',
      }[urgency];

      // Send push notification
      const pushNotification: PushNotificationRequest = {
        userId,
        type: 'push',
        recipient,
        message: `${urgencyEmoji} ${message}`,
        data: { alertType, location, urgency }
      };
      await this.sendNotification(pushNotification);

      // Send email if recipient is an email address
      if (recipient.includes('@')) {
        const emailNotification: EmailNotificationRequest = {
          type: 'email',
          recipient,
          subject: `Weather Alert - ${alertType.toUpperCase()}`,
          message: `
            <h2>Weather Alert</h2>
            <p><strong>Type:</strong> ${alertType}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Urgency:</strong> ${urgency}</p>
            <p>${message}</p>
          `
        };
        await this.sendNotification(emailNotification);
      }
      // Send SMS if recipient is a phone number
      else if (/^\+?\d+$/.test(recipient)) {
        const smsNotification: SMSNotificationRequest = {
          type: 'sms',
          recipient,
          message: `${urgencyEmoji} ${message}`
        };
        await this.sendNotification(smsNotification);
      }

      logInfo('Weather alert sent successfully', { alertType, location, urgency });
    } catch (error) {
      logError('Failed to send weather alert', error as Error);
      throw error;
    }
  }

  // Send pest alert
  async sendPestAlert(
    userId: string,
    recipient: string,
    pestName: string,
    severity: 'low' | 'medium' | 'high',
    location: string
  ): Promise<void> {
    try {
      const severityEmoji = {
        low: '⚪',
        medium: '🟡',
        high: '🔴',
      }[severity];

      const message = `🐛 Pest Alert: ${pestName} detected in ${location}. Severity: ${severity}. Take appropriate control measures.`;

      // Send push notification
      const pushNotification: PushNotificationRequest = {
        userId,
        type: 'push',
        recipient,
        message: `${severityEmoji} ${message}`,
        data: { pestName, location, severity }
      };
      await this.sendNotification(pushNotification);

      // Send email if recipient is an email address
      if (recipient.includes('@')) {
        const emailNotification: EmailNotificationRequest = {
          type: 'email',
          recipient,
          subject: `Pest Alert - ${pestName}`,
          message: `
            <h2>Pest Alert</h2>
            <p><strong>Pest:</strong> ${pestName}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Severity:</strong> ${severity}</p>
            <p>Please take appropriate control measures.</p>
          `
        };
        await this.sendNotification(emailNotification);
      }
      // Send SMS if recipient is a phone number
      else if (/^\+?\d+$/.test(recipient)) {
        const smsNotification: SMSNotificationRequest = {
          type: 'sms',
          recipient,
          message: `${severityEmoji} ${message}`
        };
        await this.sendNotification(smsNotification);
      }

      logInfo('Pest alert sent successfully', { pestName, location, severity });
    } catch (error) {
      logError('Failed to send pest alert', error as Error);
      throw error;
    }
  }

  // Send harvest reminder
  async sendHarvestReminder(
    userId: string,
    recipient: string,
    cropVariety: string,
    expectedDate: Date,
    daysLeft: number
  ): Promise<void> {
    try {
      const message = `🌾 Harvest Reminder: ${cropVariety} is due for harvest in ${daysLeft} days (${expectedDate.toLocaleDateString()}).`;

      // Send push notification
      const pushNotification: PushNotificationRequest = {
        userId,
        type: 'push',
        recipient,
        message,
        data: { cropVariety, expectedDate, daysLeft }
      };
      await this.sendNotification(pushNotification);

      // Send email if recipient is an email address
      if (recipient.includes('@')) {
        const emailNotification: EmailNotificationRequest = {
          type: 'email',
          recipient,
          subject: `Harvest Reminder - ${cropVariety}`,
          message: `
            <h2>Harvest Reminder</h2>
            <p><strong>Crop:</strong> ${cropVariety}</p>
            <p><strong>Expected Harvest Date:</strong> ${expectedDate.toLocaleDateString()}</p>
            <p><strong>Days Left:</strong> ${daysLeft}</p>
            <p>Start preparing your harvest equipment and storage facilities.</p>
          `
        };
        await this.sendNotification(emailNotification);
      }
      // Send SMS if recipient is a phone number
      else if (/^\+?\d+$/.test(recipient)) {
        const smsNotification: SMSNotificationRequest = {
          type: 'sms',
          recipient,
          message
        };
        await this.sendNotification(smsNotification);
      }

      logInfo('Harvest reminder sent successfully', { cropVariety, expectedDate, daysLeft });
    } catch (error) {
      logError('Failed to send harvest reminder', error as Error);
      throw error;
    }
  }

  // Send activity reminder
  async sendActivityReminder(
    userId: string,
    recipient: string,
    activityType: string,
    dueDate: Date,
    cropInfo?: string
  ): Promise<void> {
    try {
      const message = `📝 Activity Reminder: ${activityType}${cropInfo ? ` for ${cropInfo}` : ''} is due on ${dueDate.toLocaleDateString()}.`;

      // Send push notification
      const pushNotification: PushNotificationRequest = {
        userId,
        type: 'push',
        recipient,
        message,
        data: { activityType, dueDate, cropInfo }
      };
      await this.sendNotification(pushNotification);

      // Send email if recipient is an email address
      if (recipient.includes('@')) {
        const emailNotification: EmailNotificationRequest = {
          type: 'email',
          recipient,
          subject: `Activity Reminder - ${activityType}`,
          message: `
            <h2>Activity Reminder</h2>
            <p><strong>Activity:</strong> ${activityType}</p>
            ${cropInfo ? `<p><strong>Crop:</strong> ${cropInfo}</p>` : ''}
            <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
            <p>Please ensure this activity is completed on time.</p>
          `
        };
        await this.sendNotification(emailNotification);
      }
      // Send SMS if recipient is a phone number
      else if (/^\+?\d+$/.test(recipient)) {
        const smsNotification: SMSNotificationRequest = {
          type: 'sms',
          recipient,
          message
        };
        await this.sendNotification(smsNotification);
      }

      logInfo('Activity reminder sent successfully', { activityType, dueDate, cropInfo });
    } catch (error) {
      logError('Failed to send activity reminder', error as Error);
      throw error;
    }
  }

  // Send push notification
  private async sendPushNotification(
    deviceToken: string,
    message: string,
    data?: any
  ): Promise<{ messageId: string; status: string }> {
    try {
      // TODO: Integrate with push notification service
      // - Firebase Cloud Messaging
      // - OneSignal
      // - AWS SNS Mobile Push
      
      logInfo('Push notification sending started', { deviceToken });

      // Simulate push notification sending
      await new Promise(resolve => setTimeout(resolve, 300));

      const result = {
        messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
      };

      logInfo('Push notification sent successfully', { 
        deviceToken, 
        messageId: result.messageId 
      });

      return result;
    } catch (error) {
      logError('Push notification sending failed', error as Error, { deviceToken, message, data });
      throw new Error(ERROR_CODES.PUSH_NOTIFICATION_FAILED);
    }
  }
} 