import { ERROR_CODES } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';

export interface NotificationRequest {
  userId: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  recipient: string; // email address or phone number
  subject?: string;
  message: string;
  templateId?: string;
  data?: any; // Template variables
}

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
      const preferredMethod = urgency === 'high' ? 'whatsapp' : 'sms';

      await this.sendNotification({
        userId,
        type: preferredMethod,
        recipient,
        message,
        subject: `Weather Alert - ${alertType.toUpperCase()}`,
      });

      logInfo('Weather alert sent', { userId, alertType, location, urgency });
    } catch (error) {
      logError('Weather alert sending failed', error as Error, { 
        userId, 
        alertType, 
        location 
      });
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
      const severityEmojis = { low: '🟡', medium: '🟠', high: '🔴' };
      const emoji = severityEmojis[severity];

      const message = `${emoji} Pest Alert: ${pestName} detected in ${location}. ` +
        `Severity: ${severity.toUpperCase()}. Check your crops and consider appropriate treatment measures.`;

      await this.sendNotification({
        userId,
        type: 'whatsapp',
        recipient,
        message,
        subject: `Pest Alert - ${pestName}`,
      });

      logInfo('Pest alert sent', { userId, pestName, severity, location });
    } catch (error) {
      logError('Pest alert sending failed', error as Error, { 
        userId, 
        pestName, 
        severity 
      });
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
      const message = `🌱 Harvest Reminder: Your ${cropVariety} crop is expected to be ready for harvest ` +
        `in ${daysLeft} days (${expectedDate.toLocaleDateString()}). Start preparing for harvest activities.`;

      await this.sendNotification({
        userId,
        type: 'whatsapp',
        recipient,
        message,
        subject: 'Harvest Reminder',
      });

      logInfo('Harvest reminder sent', { userId, cropVariety, daysLeft });
    } catch (error) {
      logError('Harvest reminder sending failed', error as Error, { 
        userId, 
        cropVariety 
      });
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
      const crop = cropInfo ? ` for your ${cropInfo} crop` : '';
      const message = `📅 Activity Reminder: ${activityType}${crop} is scheduled for ` +
        `${dueDate.toLocaleDateString()}. Don't forget to complete this important farming activity.`;

      await this.sendNotification({
        userId,
        type: 'sms',
        recipient,
        message,
        subject: 'Farming Activity Reminder',
      });

      logInfo('Activity reminder sent', { userId, activityType, dueDate });
    } catch (error) {
      logError('Activity reminder sending failed', error as Error, { 
        userId, 
        activityType 
      });
    }
  }

  // Private methods
  private async sendPushNotification(
    deviceToken: string,
    _message: string,
    _data?: any
  ): Promise<{ messageId: string; status: string }> {
    try {
      // TODO: Integrate with push notification service
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNS)
      
      logInfo('Push notification sending started', { deviceToken });

      // Simulate push notification
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
      logError('Push notification sending failed', error as Error, { deviceToken });
      throw new Error('Push notification failed');
    }
  }
} 