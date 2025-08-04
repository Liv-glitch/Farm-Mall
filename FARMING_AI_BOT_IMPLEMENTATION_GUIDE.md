# 🌾 FarmMall AI Bot Implementation Guide

## 📋 Platform Overview

### **Current FarmMall API Architecture**
- **Backend**: Node.js/TypeScript with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **AI Services**: Google Gemini AI + Plant.id fallback
- **File Storage**: Supabase with media management
- **Caching**: Redis for performance optimization
- **Authentication**: JWT-based with role management

### **Existing AI Capabilities**
- **Plant Identification**: Multi-provider AI (Gemini + Plant.id)
- **Health Assessment**: Disease detection, pest identification, nutritional analysis
- **Soil Analysis**: PDF document processing with AI insights
- **Yield Calculator**: AI-powered harvest predictions
- **Weather Integration**: Forecasting and alerts
- **Cost Analysis**: Production cycle cost tracking

### **Production Management Features**
- **Production Cycles**: Complete farming lifecycle tracking
- **Activity Logging**: Planting, fertilizing, weeding, pest control, irrigation, harvesting
- **Expense Tracking**: Labor costs, inputs, equipment
- **Collaboration**: Farm team management and sharing

### **Notification System**
- **Multi-channel**: WhatsApp, Email, SMS, Push notifications
- **Smart Alerts**: Weather warnings, pest alerts, harvest reminders
- **Activity Reminders**: Scheduled farming tasks

---

## 🤖 AI Bot Implementation Strategy

### **Recommended Approach: RASA + WhatsApp Business API**

#### **Bot Architecture**
```
WhatsApp Business API
    ↓
RASA Core (NLU + Dialogue Management)
    ↓
RASA Actions Server (Custom Actions)
    ↓
FarmMall API (Existing Services)
    ↓
PostgreSQL Database
```

---

## 🎯 Bot Capabilities

### **1. Farming Activity Logging via WhatsApp**

#### **Features:**
- Voice-to-text activity logging
- Photo documentation of activities
- Cost tracking with receipts
- GPS location tagging
- Weather data integration

#### **Example Intents:**
```yaml
# RASA Domain File
intents:
  - log_activity
  - log_expense
  - view_activities
  - update_activity

entities:
  - activity_type
  - crop
  - cost
  - location
  - date
  - notes

slots:
  activity_type:
    type: text
    mappings:
    - type: from_entity
      entity: activity_type
  crop:
    type: text
    mappings:
    - type: from_entity
      entity: crop
  cost:
    type: float
    mappings:
    - type: from_entity
      entity: cost
```

#### **Example Conversations:**
```
User: "I planted 2 acres of potatoes today, cost 50,000 KES"
Bot: "✅ Activity logged! 
     📝 Type: Planting
     🌾 Crop: Potato
     💰 Cost: 50,000 KES
     📍 Location: [GPS detected]
     📅 Date: Today
     
     Would you like to add any notes or photos?"
```

### **2. Pest/Disease Scanning**

#### **Features:**
- Camera integration for plant photos
- Real-time AI analysis using Gemini services
- Treatment recommendations
- Follow-up monitoring

#### **Example Intents:**
```yaml
intents:
  - scan_plant_health
  - get_treatment
  - report_disease
  - track_recovery

entities:
  - plant_type
  - symptoms
  - severity
  - location
```

#### **Example Conversations:**
```
User: [Sends photo of potato plant with yellow leaves]
Bot: "🔍 Analyzing your plant image...
     
     🚨 Health Alert Detected!
     ❌ Issue: Early Blight (Alternaria solani)
     📊 Confidence: 94%
     ⚠️ Severity: Moderate
     
     💊 Treatment Options:
     1. Remove infected leaves
     2. Apply copper-based fungicide
     3. Improve air circulation
     
     📞 Contact extension officer for detailed guidance"
```

### **3. Smart Reminders & Updates**

#### **Features:**
- Weather-based activity scheduling
- Market price alerts
- Disease outbreak warnings
- Harvest timing optimization

#### **Example Intents:**
```yaml
intents:
  - set_reminder
  - check_weather
  - get_market_prices
  - schedule_activity

entities:
  - reminder_type
  - date
  - crop
  - priority
```

#### **Example Conversations:**
```
User: "Remind me to fertilize my potatoes next week"
Bot: "⏰ Reminder set!
     📅 Date: [Next week]
     🌾 Activity: Fertilize potatoes
     📍 Location: Your farm
     
     🌤️ Weather forecast: Light rain expected
     💡 Tip: Apply fertilizer before rain for better absorption
     
     Would you like me to check current fertilizer prices?"
```

---

## 🔧 Technical Implementation

### **1. RASA Setup**

#### **Installation:**
```bash
# Create virtual environment
python -m venv farming_bot
source farming_bot/bin/activate  # On Windows: farming_bot\Scripts\activate

# Install RASA
pip install rasa

# Initialize RASA project
rasa init --no-prompt
```

#### **Project Structure:**
```
farming_bot/
├── actions/
│   ├── __init__.py
│   ├── actions.py
│   └── custom_actions.py
├── data/
│   ├── nlu.yml
│   ├── stories.yml
│   └── domain.yml
├── config.yml
├── credentials.yml
├── endpoints.yml
└── rasa.yml
```

### **2. WhatsApp Business API Integration**

#### **Current Status:**
- ✅ Notification service framework exists
- ✅ WhatsApp message interface defined
- ⚠️ Needs actual API integration

#### **Provider Options:**
1. **Meta WhatsApp Business API** (Recommended)
2. **Twilio WhatsApp API**
3. **360Dialog API**

#### **Implementation Steps:**
```typescript
// src/services/whatsapp.service.ts
export class WhatsAppService {
  private client: any; // Meta WhatsApp Business API client

  async sendMessage(to: string, message: string, mediaUrl?: string) {
    // Implementation for sending messages
  }

  async handleIncomingMessage(message: any) {
    // Route message to RASA
    const rasaResponse = await this.sendToRasa(message);
    return rasaResponse;
  }

  private async sendToRasa(message: any) {
    // Send to RASA webhook
    const response = await fetch('http://localhost:5005/webhooks/rest/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: message.from,
        message: message.text
      })
    });
    return response.json();
  }
}
```

### **3. RASA Actions Integration**

#### **Custom Actions:**
```python
# actions/custom_actions.py
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
import requests
import json

class ActionLogActivity(Action):
    def name(self) -> Text:
        return "action_log_activity"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Extract entities
        activity_type = tracker.get_slot("activity_type")
        crop = tracker.get_slot("crop")
        cost = tracker.get_slot("cost")
        location = tracker.get_slot("location")
        
        # Call FarmMall API
        api_url = "http://localhost:3000/api/v1/production/activities"
        payload = {
            "type": activity_type,
            "crop": crop,
            "cost": cost,
            "location": location,
            "userId": tracker.sender_id
        }
        
        response = requests.post(api_url, json=payload)
        
        if response.status_code == 200:
            dispatcher.utter_message(
                text=f"✅ Activity logged successfully!\n"
                     f"📝 Type: {activity_type}\n"
                     f"🌾 Crop: {crop}\n"
                     f"💰 Cost: {cost} KES"
            )
        else:
            dispatcher.utter_message(
                text="❌ Sorry, I couldn't log your activity. Please try again."
            )
        
        return []

class ActionScanPlantHealth(Action):
    def name(self) -> Text:
        return "action_scan_plant_health"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get image from message
        image_url = tracker.latest_message.get("image")
        
        if image_url:
            # Call FarmMall AI service
            api_url = "http://localhost:3000/api/v1/enhanced-plant/health"
            
            # Download and process image
            # Send to AI service for analysis
            
            dispatcher.utter_message(
                text="🔍 Analyzing your plant image...\n"
                     "This may take a few moments."
            )
        else:
            dispatcher.utter_message(
                text="📸 Please send a photo of your plant for health analysis."
            )
        
        return []
```

### **4. Database Integration**

#### **New Tables for Bot:**
```sql
-- Bot conversation history
CREATE TABLE bot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    intent VARCHAR(100),
    entities JSONB,
    response TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bot user preferences
CREATE TABLE bot_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    language VARCHAR(10) DEFAULT 'en',
    notification_frequency VARCHAR(20) DEFAULT 'daily',
    preferred_reminder_time TIME DEFAULT '08:00:00',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📱 WhatsApp Integration Details

### **1. Meta WhatsApp Business API Setup**

#### **Prerequisites:**
- Meta Developer Account
- WhatsApp Business API access
- Verified business phone number

#### **Configuration:**
```yaml
# credentials.yml
whatsapp:
  access_token: "your_access_token"
  phone_number_id: "your_phone_number_id"
  verify_token: "your_verify_token"
  app_secret: "your_app_secret"
```

#### **Webhook Setup:**
```typescript
// src/routes/whatsapp.routes.ts
import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = Router();

// Webhook verification
router.get('/webhook', WhatsAppController.verifyWebhook);

// Message handling
router.post('/webhook', WhatsAppController.handleWebhook);

export default router;
```

### **2. Message Handling**

#### **Incoming Message Types:**
- **Text Messages**: Activity logging, queries
- **Image Messages**: Plant health scanning
- **Document Messages**: Receipt uploads
- **Location Messages**: GPS coordinates

#### **Response Types:**
- **Text Responses**: Information, confirmations
- **Image Responses**: Treatment guides, charts
- **Button Responses**: Quick actions
- **List Responses**: Options selection

---

## 🎯 Bot Training Data

### **1. NLU Training Data**

```yaml
# data/nlu.yml
version: "3.1"

nlu:
- intent: log_activity
  examples: |
    - I planted [potato](crop) today
    - Just finished [weeding](activity_type) my [maize](crop) field
    - [Fertilized](activity_type) 3 acres of [beans](crop)
    - Spent [50000](cost) KES on [pest control](activity_type)
    - [Irrigation](activity_type) completed for [tomato](crop)

- intent: scan_plant_health
  examples: |
    - My [potato](crop) leaves are turning yellow
    - What's wrong with my [maize](crop) plants?
    - [Disease](symptoms) on my [tomato](crop) plants
    - Check the health of my [beans](crop)
    - My [crop](crop) has [spots](symptoms) on leaves

- intent: set_reminder
  examples: |
    - Remind me to [fertilize](reminder_type) next week
    - Set reminder for [harvest](reminder_type) in 2 weeks
    - Schedule [irrigation](reminder_type) for tomorrow
    - Alert me when it's time to [weed](reminder_type)
    - Remind me about [pest control](reminder_type) next month
```

### **2. Stories Training Data**

```yaml
# data/stories.yml
version: "3.1"

stories:
- story: log activity
  steps:
  - intent: log_activity
  - action: action_log_activity
  - action: utter_ask_for_notes

- story: scan plant health
  steps:
  - intent: scan_plant_health
  - action: action_scan_plant_health
  - action: utter_ask_for_photo

- story: set reminder
  steps:
  - intent: set_reminder
  - action: action_set_reminder
  - action: utter_reminder_confirmed
```

---

## 🚀 Deployment Strategy

### **1. Development Environment**

#### **Local Setup:**
```bash
# Start RASA server
rasa run --enable-api --cors "*" --port 5005

# Start RASA actions server
rasa run actions --port 5055

# Start FarmMall API
npm run dev

# Test WhatsApp webhook
ngrok http 3000
```

### **2. Production Deployment**

#### **Docker Setup:**
```dockerfile
# Dockerfile for RASA bot
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5005

CMD ["rasa", "run", "--enable-api", "--cors", "*", "--port", "5005"]
```

#### **Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  farming-bot:
    build: ./farming-bot
    ports:
      - "5005:5005"
    environment:
      - FARM_MALL_API_URL=http://farmmall-api:3000
    depends_on:
      - farmmall-api

  farmmall-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: farmmall
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 📊 Monitoring & Analytics

### **1. Bot Performance Metrics**

#### **Key Metrics:**
- **Intent Recognition Accuracy**: 95%+ target
- **Response Time**: <2 seconds
- **User Engagement**: Daily active users
- **Task Completion Rate**: Activity logging success

#### **Monitoring Tools:**
- **RASA X**: Conversation management
- **Custom Dashboard**: FarmMall integration
- **WhatsApp Business API**: Message delivery status

### **2. Analytics Dashboard**

```typescript
// src/controllers/analytics.controller.ts
export class AnalyticsController {
  async getBotMetrics(req: Request, res: Response) {
    const metrics = {
      totalConversations: await this.getTotalConversations(),
      successfulActivities: await this.getSuccessfulActivities(),
      plantScans: await this.getPlantScans(),
      userEngagement: await this.getUserEngagement()
    };
    
    res.json({ success: true, data: metrics });
  }
}
```

---

## 🔒 Security & Privacy

### **1. Data Protection**

#### **WhatsApp Data:**
- End-to-end encryption (handled by WhatsApp)
- Message retention policies
- User consent management

#### **FarmMall Integration:**
- JWT authentication for API calls
- Rate limiting on bot endpoints
- Data anonymization for analytics

### **2. User Privacy**

#### **Consent Management:**
```typescript
// User consent tracking
interface BotConsent {
  userId: string;
  dataCollection: boolean;
  marketingMessages: boolean;
  healthDataSharing: boolean;
  locationTracking: boolean;
  consentDate: Date;
}
```

---

## 📈 Future Enhancements

### **1. Advanced Features**

#### **Voice Integration:**
- Voice-to-text for activity logging
- Audio responses for illiterate users
- Multi-language support (Swahili, English)

#### **AI Improvements:**
- Predictive analytics for crop diseases
- Market price predictions
- Weather-based farming recommendations

#### **Integration Expansions:**
- M-Pesa payment integration
- Government extension services
- Agricultural input suppliers

### **2. Scalability**

#### **Multi-Platform Support:**
- Telegram Bot
- Facebook Messenger
- SMS fallback
- Mobile app integration

#### **Regional Expansion:**
- Other East African countries
- Different crop types
- Local language support

---

## 📝 Implementation Checklist

### **Phase 1: Foundation (Week 1-2)**
- [ ] Set up RASA development environment
- [ ] Configure WhatsApp Business API
- [ ] Create basic conversation flows
- [ ] Integrate with FarmMall authentication

### **Phase 2: Core Features (Week 3-4)**
- [ ] Implement activity logging
- [ ] Add plant health scanning
- [ ] Create reminder system
- [ ] Test with sample users

### **Phase 3: Enhancement (Week 5-6)**
- [ ] Add advanced NLU training
- [ ] Implement analytics dashboard
- [ ] Optimize response times
- [ ] Security audit

### **Phase 4: Deployment (Week 7-8)**
- [ ] Production environment setup
- [ ] Load testing
- [ ] User training materials
- [ ] Go-live preparation

---

## 🆘 Troubleshooting

### **Common Issues:**

#### **1. RASA Training Issues**
```bash
# Check training data
rasa data validate

# Test NLU
rasa test nlu

# Interactive training
rasa interactive
```

#### **2. WhatsApp Integration Issues**
```bash
# Verify webhook
curl -X GET "https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID?fields=webhook_verify_token&access_token=YOUR_ACCESS_TOKEN"

# Test message sending
curl -X POST "https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"RECIPIENT_PHONE","type":"text","text":{"body":"Hello World!"}}'
```

#### **3. FarmMall API Integration Issues**
```bash
# Test API connectivity
curl -X GET "http://localhost:3000/api/v1/health" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check database connection
npm run test:storage
```

---

## 📚 Resources

### **Documentation:**
- [RASA Documentation](https://rasa.com/docs/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [FarmMall API Documentation](http://localhost:3000/api-docs)

### **Training Resources:**
- [RASA Masterclass](https://rasa.com/resources/)
- [WhatsApp Business API Tutorial](https://developers.facebook.com/docs/whatsapp/getting-started)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### **Community:**
- [RASA Community Forum](https://forum.rasa.com/)
- [WhatsApp Developer Community](https://developers.facebook.com/community/)
- [Kenya Agricultural Extension Network](https://www.kaen.org/)

---

*This guide provides a comprehensive roadmap for implementing an AI-powered farming bot using your existing FarmMall API infrastructure. The modular approach allows for incremental development and testing while leveraging your current AI capabilities.* 