# 🌾 FarmMall AI Services - Frontend Integration Guide

## 📋 Overview

Your FarmMall API now provides **4 AI-powered agricultural services** with Gemini AI as the primary provider and automatic fallback to Plant.id when needed. All services are accessed through the same endpoints your frontend currently uses, but now return enhanced data.

## 🔧 What's Changed for Frontend

**✅ GOOD NEWS:** Your existing Plant.id integration continues to work **without any changes**!

**🚀 NEW:** Enhanced responses now include:
- Gemini AI analysis with Kenya-specific insights
- Comprehensive treatment recommendations  
- Regional cultivation advice
- Economic analysis and optimization tips

---

## 🎯 AI Services Available

### 1️⃣ **Plant Identification** (Enhanced existing endpoint)
### 2️⃣ **Plant Health Assessment** (Enhanced existing endpoint) 
### 3️⃣ **Soil Analysis** (New endpoint)
### 4️⃣ **Smart Yield Calculator** (New endpoint)

---

## 📡 API Endpoints & Integration

### 🔐 **Authentication Required**
All endpoints require Bearer token authentication:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'multipart/form-data' // For file uploads
}
```

---

## 1️⃣ PLANT IDENTIFICATION

### **Endpoint:** `POST /api/v1/enhanced-plant/identify`

**📤 Request Format:**
```javascript
const formData = new FormData();
formData.append('image1', imageFile); // Required: Plant image file
formData.append('location', 'Central Kenya'); // Optional: Location string
formData.append('plant_type', 'crop'); // Optional: 'crop' | 'weed' | 'ornamental'
formData.append('latitude', '-1.2921'); // Optional: GPS latitude
formData.append('longitude', '36.8219'); // Optional: GPS longitude

const response = await fetch('/api/v1/enhanced-plant/identify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**📥 Response Format:**
```javascript
{
  "success": true,
  "data": {
    "plants": [{
      "scientificName": "Rosa spp.",
      "commonName": "Rose",
      "family": "Rosaceae",
      "confidence": 0.9,
      "description": "Detailed plant description...",
      "characteristics": {
        "leafType": "Pinnately compound...",
        "growthHabit": "Shrubs, climbers...",
        "size": "0.3m to 7m+"
      },
      "cultivationTips": [
        "Requires good air circulation...",
        "Regular pruning essential..."
      ],
      "wateringNeeds": "Moderate to high...",
      "soilPreferences": "Well-drained, fertile loam...",
      "seasonalInfo": {
        "plantingSeason": "During rainy seasons...",
        "floweringSeason": "Year-round in Kenya..."
      }
    }],
    "regionalContext": "Kenya-specific growing information..."
  },
  "provider": "gemini", // or "plantid" if fallback
  "enhanced_features": {
    "cultivation_tips": true,
    "regional_varieties": true,
    "market_info": true,
    "seasonal_guidance": true
  },
  "metadata": {
    "analysisId": "uuid",
    "processingTime": 23000
  }
}
```

---

## 2️⃣ PLANT HEALTH ASSESSMENT

### **Endpoint:** `POST /api/v1/enhanced-plant/health`

**📤 Request Format:**
```javascript
const formData = new FormData();
formData.append('image1', imageFile); // Required: Plant image file
formData.append('location', 'Nakuru, Kenya'); // Optional: Location
formData.append('plant_type', 'maize'); // Optional: Expected plant type
formData.append('symptoms', 'yellowing leaves, brown spots'); // Optional: Observed symptoms

const response = await fetch('/api/v1/enhanced-plant/health', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**📥 Response Format:**
```javascript
{
  "success": true,
  "data": {
    "healthStatus": {
      "overall": "diseased", // "healthy" | "diseased" | "stressed"
      "isHealthy": false,
      "healthScore": 60, // 0-100
      "urgency": "medium", // "low" | "medium" | "high"
      "confidence": 0.95,
      "assessment": "Detailed health assessment..."
    },
    "diseases": [{
      "name": "Black Spot Disease",
      "type": "fungal",
      "severity": "moderate",
      "confidence": 0.98,
      "symptoms": [
        "Irregular dark spots on leaves...",
        "Yellowing of surrounding tissue..."
      ],
      "treatment": {
        "immediate": [
          "Remove infected leaves immediately",
          "Improve air circulation"
        ],
        "organic": [
          "Apply neem oil spray every 7-14 days",
          "Use copper-based fungicides"
        ],
        "chemical": [
          "Myclobutanil (Systhane, Immunox)",
          "Chlorothalonil (Daconil)"
        ]
      },
      "regionalConsiderations": "In Kenya, high humidity areas..."
    }],
    "preventiveMeasures": [
      "Select disease-resistant varieties",
      "Ensure adequate plant spacing"
    ],
    "followUpRecommendations": [
      "Monitor weekly for new symptoms",
      "Reassess treatment effectiveness"
    ]
  },
  "provider": "gemini",
  "enhanced_features": {
    "treatment_prioritization": true,
    "cost_effective_solutions": true,
    "preventive_measures": true,
    "regional_disease_patterns": true
  }
}
```

---

## 3️⃣ SOIL ANALYSIS

### **Endpoint:** `POST /api/v1/enhanced-plant/soil`

**📤 Request Format:**
```javascript
const formData = new FormData();
formData.append('document', pdfFile); // Required: Soil test report PDF
formData.append('location', 'Central Kenya'); // Optional: Farm location
formData.append('crop_type', 'potato'); // Optional: Intended crop
formData.append('farm_size', '5'); // Optional: Farm size in acres
formData.append('budget', 'medium'); // Optional: 'low' | 'medium' | 'high'

const response = await fetch('/api/v1/enhanced-plant/soil', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**📥 Response Format:**
```javascript
{
  "success": true,
  "data": {
    "basicProperties": {
      "ph": 6.5,
      "phCategory": "slightly_acidic",
      "organicMatter": 3.2,
      "organicMatterCategory": "medium"
    },
    "nutrients": {
      "macronutrients": {
        "nitrogen": {
          "available": 45,
          "category": "medium",
          "recommendations": ["Apply 50kg/ha CAN at planting"]
        },
        "phosphorus": {
          "available": 25,
          "category": "high", 
          "recommendations": ["Reduce DAP application"]
        },
        "potassium": {
          "available": 180,
          "category": "adequate",
          "recommendations": ["Maintain current levels"]
        }
      }
    },
    "soilHealth": {
      "overallScore": 75,
      "category": "good",
      "limitingFactors": ["Low nitrogen", "Compaction"],
      "strengths": ["Good pH", "Adequate phosphorus"]
    },
    "cropRecommendations": [
      {
        "crop": "potato",
        "suitability": "excellent",
        "expectedYield": "25-30 tonnes/ha",
        "specificAdvice": "Ideal soil conditions for potato production"
      }
    ],
    "fertilizationPlan": {
      "immediate": [
        "Apply 10 tonnes/ha well-composted manure",
        "50kg/ha DAP at planting"
      ],
      "seasonal": [
        "Top-dress with 50kg/ha CAN at 4 weeks",
        "Apply foliar nutrients at flowering"
      ]
    },
    "regionFactors": {
      "climateConsiderations": ["High altitude cooling", "Bimodal rainfall"],
      "localAvailability": ["DAP readily available", "CAN from NCPB"],
      "economicFactors": ["Fertilizer subsidy programs available"]
    }
  },
  "provider": "gemini"
}
```

---

## 4️⃣ SMART YIELD CALCULATOR

### **Endpoint:** `POST /api/v1/enhanced-plant/yield`

**📤 Request Format:**
```javascript
const yieldData = {
  // Required fields
  "cropType": "maize", // Required: Crop type
  "farmSize": 2.5, // Required: Farm size in acres  
  "location": "Nakuru", // Required: Location in Kenya
  
  // Optional basic fields
  "variety": "H614", // Crop variety
  "farmingSystem": "mixed", // "organic" | "conventional" | "mixed"
  "irrigationType": "rainfed", // "rainfed" | "drip" | "sprinkler" | "furrow"
  "fertilizationLevel": "medium", // "low" | "medium" | "high" | "optimal"
  "pestManagement": "ipm", // "none" | "minimal" | "moderate" | "intensive" | "ipm"
  "season": "main", // Season description
  "inputBudget": 50000, // Available budget in KES
  "targetMarket": "local", // "local" | "regional" | "export"
  
  // Optional advanced fields
  "soilData": {
    "ph": 6.5,
    "organicMatter": 3.2,
    "nitrogen": 45,
    "phosphorus": 25,
    "potassium": 180,
    "texture": "clay loam",
    "drainage": "well-drained"
  },
  "previousYields": [
    {"year": 2023, "yield": 12000, "practices": "conventional farming"},
    {"year": 2022, "yield": 10500, "practices": "organic trial"}
  ]
};

const response = await fetch('/api/v1/enhanced-plant/yield', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(yieldData)
});
```

**📥 Response Format:**
```javascript
{
  "success": true,
  "data": {
    "estimatedYield": {
      "quantity": 5000,
      "unit": "kg",
      "range": {
        "minimum": 3750,
        "maximum": 6250,
        "mostLikely": 5000
      },
      "confidence": 0.6
    },
    "economicProjection": {
      "grossRevenue": {
        "localMarket": 1346.15,
        "regionalMarket": 1615.38,
        "exportMarket": 2153.85
      },
      "inputCosts": {
        "seeds": 48.08,
        "fertilizers": 115.38,
        "pesticides": 67.31,
        "labor": 326.92,
        "irrigation": 0,
        "other": 32.69,
        "total": 590.38
      },
      "netProfit": {
        "conservative": 250,
        "realistic": 755.77,
        "optimistic": 1384.62
      },
      "profitMargin": 56.14,
      "breakEvenPrice": 0.12,
      "roi": 128.01
    },
    "riskAssessment": {
      "weatherRisk": "high",
      "diseaseRisk": "medium", 
      "marketRisk": "medium",
      "overallRisk": "medium-high",
      "riskFactors": [
        "Rainfall variability",
        "Fall Armyworm outbreaks",
        "Volatile market prices"
      ],
      "mitigationStrategies": [
        "Plant drought-tolerant varieties",
        "Implement IPM strategies",
        "Access market information"
      ]
    },
    "optimizationRecommendations": {
      "yieldImprovement": [
        {
          "practice": "Soil testing and nutrient management",
          "expectedIncrease": 15, // percentage increase
          "cost": 30,
          "priority": "high",
          "timeline": "Pre-planting"
        }
      ],
      "costReduction": [
        {
          "practice": "Bulk input purchase through cooperatives",
          "expectedSavings": 7, // percentage savings
          "implementation": "Join farmer group",
          "priority": "medium"
        }
      ]
    },
    "seasonalCalendar": {
      "plantingWindow": {
        "optimal": "Late March - Mid April",
        "extended": "Late April - Early May"
      },
      "criticalActivities": [
        {
          "activity": "Land preparation",
          "timing": "February - Early March",
          "importance": "critical",
          "cost": 100
        }
      ],
      "harvestWindow": {
        "estimated": "Late July - Early August",
        "factors": ["Grain moisture content", "Market prices"]
      }
    },
    "confidence": 0.6,
    "limitations": [
      "Analysis assumes medium fertilization practices",
      "No historical farm data available"
    ],
    "recommendations": [
      "Secure realistic input budget",
      "Conduct detailed soil analysis",
      "Invest in quality certified seeds"
    ]
  },
  "provider": "gemini",
  "processing_time": 39932,
  "features": {
    "economic_analysis": true,
    "risk_assessment": true,
    "optimization_recommendations": true,
    "seasonal_calendar": true
  }
}
```

---

## 🚀 Frontend Implementation Tips

### **1. Loading States**
```javascript
// Show loading for 20-40 seconds
const [loading, setLoading] = useState(false);
const [progress, setProgress] = useState(0);

// Simulate progress for better UX
useEffect(() => {
  if (loading) {
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 90));
    }, 800);
    return () => clearInterval(interval);
  }
}, [loading]);
```

### **2. Error Handling**
```javascript
try {
  const response = await fetch(endpoint, options);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Analysis failed');
  }
  
  // Handle success
  if (data.provider === 'gemini') {
    // Show enhanced features badge
    showEnhancedFeatures(data.enhanced_features);
  }
  
} catch (error) {
  // Show user-friendly error message
  setError('Analysis failed. Please try again.');
}
```

### **3. File Upload Validation**
```javascript
const validateFile = (file, type) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (type === 'image') {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type) && file.size <= maxSize;
  }
  
  if (type === 'document') {
    return file.type === 'application/pdf' && file.size <= maxSize;
  }
  
  return false;
};
```

### **4. Enhanced Features Display**
```javascript
const EnhancedBadge = ({ features }) => (
  <div className="enhanced-features">
    <span className="ai-badge">🤖 Gemini AI Enhanced</span>
    <ul>
      {features.cultivation_tips && <li>✅ Kenya-specific cultivation tips</li>}
      {features.regional_varieties && <li>✅ Regional variety recommendations</li>}
      {features.market_info && <li>✅ Local market insights</li>}
      {features.treatment_prioritization && <li>✅ Treatment prioritization</li>}
    </ul>
  </div>
);
```

---

## 📋 Summary for Frontend Team

### **✅ What Works Immediately:**
- Existing Plant.id integration continues working
- Same endpoints, enhanced responses
- Automatic Gemini→Plant.id fallback

### **🆕 New Endpoints to Add:**
- Soil Analysis: `/api/v1/enhanced-plant/soil`
- Yield Calculator: `/api/v1/enhanced-plant/yield`

### **⏱️ Expected Response Times:**
- Plant Identification: ~25 seconds
- Plant Health: ~25 seconds  
- Soil Analysis: ~30 seconds
- Yield Calculator: ~40 seconds

### **🔧 Required Changes:**
1. Add longer timeouts (60+ seconds)
2. Implement better loading states
3. Handle enhanced response formats
4. Add file validation for soil PDFs
5. Display Kenya-specific insights

**Your FarmMall API now provides world-class agricultural AI capabilities for Kenyan farmers! 🌾🇰🇪✨**