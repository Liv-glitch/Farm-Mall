# 📊 FarmMall AI Services - Database Storage & Pagination Guide

## 🗄️ Database Storage Structure

Your AI analysis results are stored across **4 main database tables** with full pagination support and media associations.

---

## 📋 Database Tables Overview

### **1️⃣ Plant Identifications**
**Table:** `plant_identifications`
```sql
CREATE TABLE plant_identifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  identification_result JSONB NOT NULL, -- Full Gemini/Plant.id response
  confidence_score DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Stores:**
- Plant identification results from Gemini AI or Plant.id
- Image URLs and metadata
- GPS coordinates
- Full JSON response with plant details, characteristics, cultivation tips

### **2️⃣ Plant Health Assessments**
**Table:** `plant_health_assessments`
```sql
CREATE TABLE plant_health_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  health_assessment_result JSONB NOT NULL, -- Full health analysis
  is_healthy BOOLEAN,
  diseases JSONB, -- Disease details array
  treatment_suggestions JSONB, -- Treatment recommendations
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Stores:**
- Health status, scores, and disease diagnoses
- Treatment recommendations (immediate, organic, chemical)
- Kenya-specific regional advice
- Prevention and follow-up recommendations

### **3️⃣ Soil Analysis**
**Table:** `soil_tests`
```sql
CREATE TABLE soil_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  farm_id UUID REFERENCES farms(id),
  test_date DATE,
  analysis_result JSONB, -- Full Gemini soil analysis
  status VARCHAR(50) DEFAULT 'completed',
  recommendations JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Stores:**
- Soil pH, nutrients, and physical properties
- Fertilization plans and crop recommendations
- Economic considerations and local input availability
- Farm-specific optimization advice

### **4️⃣ Yield Calculations**
**Table:** Currently stored in `production_cycles` or separate table (to be confirmed)
**Note:** The Smart Yield Calculator doesn't appear to have dedicated storage yet - this may need to be added.

### **5️⃣ Media Storage**
**Tables:** `media` and `media_associations`
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  original_url TEXT NOT NULL,
  variants JSONB, -- Thumbnail, small, medium, large URLs
  file_type VARCHAR(100),
  file_size INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE media_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL REFERENCES media(id),
  entity_type VARCHAR(100) NOT NULL, -- 'PlantIdentification', 'PlantHealthAssessment', etc.
  entity_id UUID NOT NULL,
  association_type VARCHAR(50) DEFAULT 'primary',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📡 Paginated History Endpoints

### **📍 Main History Endpoint**
```
GET /api/v1/enhanced-plant/history
```

**Query Parameters:**
- `type` (optional): Filter by analysis type
  - `plant_identification`
  - `plant_health` 
  - `soil_analysis`
- `limit` (optional): Number of records per page (default: 20, max: 100)
- `offset` (optional): Number of records to skip (default: 0)
- `userId` (optional): User ID (if not from JWT token)

**Request Examples:**
```javascript
// Get all analysis history (paginated)
GET /api/v1/enhanced-plant/history?limit=20&offset=0

// Get only plant identifications
GET /api/v1/enhanced-plant/history?type=plant_identification&limit=10

// Get page 2 of health assessments
GET /api/v1/enhanced-plant/history?type=plant_health&limit=20&offset=20
```

**Response Format:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "type": "plant_identification", // or "plant_health", "soil_analysis"
      "result": {
        // Full analysis result object
        "plants": [...], // For plant identification
        "healthStatus": {...}, // For health assessment
        "basicProperties": {...} // For soil analysis
      },
      "createdAt": "2025-08-04T10:24:26.000Z",
      "confidence": 0.95, // For plant ID
      "isHealthy": false, // For health assessment
      "status": "completed", // For soil analysis
      "media": {
        "id": "media-uuid",
        "originalUrl": "https://...",
        "variants": {
          "thumbnail": "https://...",
          "small": "https://...",
          "medium": "https://...",
          "large": "https://..."
        }
      }
    }
  ],
  "total": 45,
  "message": "History retrieved successfully"
}
```

---

## 🔍 Additional Query Endpoints

### **📍 Get Specific Analysis**
```
GET /api/v1/enhanced-plant/analysis/:analysisId
```

**Query Parameters:**
- `type` (required): Analysis type (`plant_identification`, `plant_health`, `soil_analysis`)

**Usage:**
```javascript
GET /api/v1/enhanced-plant/analysis/uuid-123?type=plant_identification
```

### **📍 Type-Specific History Endpoints** (If needed)

```javascript
// Plant Identifications only
GET /api/v1/enhanced-plant/identifications?limit=20&offset=0

// Health Assessments only  
GET /api/v1/enhanced-plant/health-assessments?limit=20&offset=0

// Soil Analyses only
GET /api/v1/enhanced-plant/soil-analyses?limit=20&offset=0
```

---

## 🎨 Frontend Integration Examples

### **React Hook for Analysis History**
```javascript
import { useState, useEffect } from 'react';

const useAnalysisHistory = (type = null, pageSize = 20) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const fetchHistory = async (pageNum = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (pageNum * pageSize).toString()
      });
      
      if (type) params.append('type', type);

      const response = await fetch(`/api/v1/enhanced-plant/history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      
      if (result.success) {
        setData(pageNum === 0 ? result.data : [...data, ...result.data]);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(0);
  }, [type]);

  const loadMore = () => {
    const nextPage = page + 1;
    fetchHistory(nextPage);
    setPage(nextPage);
  };

  return { data, loading, total, loadMore, hasMore: data.length < total };
};
```

### **Analysis History Component**
```jsx
const AnalysisHistory = () => {
  const [selectedType, setSelectedType] = useState(null);
  const { data, loading, total, loadMore, hasMore } = useAnalysisHistory(selectedType);

  const getAnalysisIcon = (type) => {
    switch (type) {
      case 'plant_identification': return '🌱';
      case 'plant_health': return '🏥';
      case 'soil_analysis': return '🌍';
      default: return '📊';
    }
  };

  const getAnalysisTitle = (analysis) => {
    switch (analysis.type) {
      case 'plant_identification':
        return analysis.result.plants?.[0]?.commonName || 'Plant Identification';
      case 'plant_health':
        return `Health: ${analysis.result.healthStatus?.overall || 'Unknown'}`;
      case 'soil_analysis':
        return `Soil Analysis - pH: ${analysis.result.basicProperties?.ph || 'N/A'}`;
      default:
        return 'Analysis';
    }
  };

  return (
    <div className="analysis-history">
      <div className="filters">
        <button 
          onClick={() => setSelectedType(null)}
          className={!selectedType ? 'active' : ''}
        >
          All Analyses
        </button>
        <button 
          onClick={() => setSelectedType('plant_identification')}
          className={selectedType === 'plant_identification' ? 'active' : ''}
        >
          🌱 Plant ID
        </button>
        <button 
          onClick={() => setSelectedType('plant_health')}
          className={selectedType === 'plant_health' ? 'active' : ''}
        >
          🏥 Health
        </button>
        <button 
          onClick={() => setSelectedType('soil_analysis')}
          className={selectedType === 'soil_analysis' ? 'active' : ''}
        >
          🌍 Soil
        </button>
      </div>

      <div className="analysis-list">
        {data.map(analysis => (
          <div key={analysis.id} className="analysis-card">
            <div className="analysis-header">
              <span className="analysis-icon">
                {getAnalysisIcon(analysis.type)}
              </span>
              <div className="analysis-info">
                <h3>{getAnalysisTitle(analysis)}</h3>
                <p className="analysis-date">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </p>
              </div>
              {analysis.confidence && (
                <span className="confidence-badge">
                  {(analysis.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            
            {analysis.media && (
              <img 
                src={analysis.media.variants?.thumbnail || analysis.media.originalUrl}
                alt="Analysis"
                className="analysis-image"
              />
            )}
            
            <div className="analysis-summary">
              {analysis.type === 'plant_identification' && (
                <p>Family: {analysis.result.plants?.[0]?.family}</p>
              )}
              {analysis.type === 'plant_health' && (
                <p className={`health-status ${analysis.isHealthy ? 'healthy' : 'unhealthy'}`}>
                  {analysis.isHealthy ? '✅ Healthy' : '⚠️ Issues Detected'}
                </p>
              )}
              {analysis.type === 'soil_analysis' && (
                <p>Status: {analysis.status}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button 
          onClick={loadMore}
          disabled={loading}
          className="load-more-btn"
        >
          {loading ? 'Loading...' : `Load More (${data.length} of ${total})`}
        </button>
      )}
    </div>
  );
};
```

### **Infinite Scroll Implementation**
```javascript
const useInfiniteScroll = (callback, hasMore) => {
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop 
          >= document.documentElement.offsetHeight - 1000 && hasMore) {
        callback();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, hasMore]);
};

// Usage in component
const { data, loading, hasMore, loadMore } = useAnalysisHistory();
useInfiniteScroll(loadMore, hasMore && !loading);
```

---

## 📊 Database Query Optimization

### **Indexes for Performance**
```sql
-- Essential indexes for fast queries
CREATE INDEX idx_plant_identifications_user_created 
ON plant_identifications(user_id, created_at DESC);

CREATE INDEX idx_plant_health_assessments_user_created 
ON plant_health_assessments(user_id, created_at DESC);

CREATE INDEX idx_soil_tests_user_created 
ON soil_tests(user_id, created_at DESC);

-- Media association indexes
CREATE INDEX idx_media_associations_entity 
ON media_associations(entity_type, entity_id);
```

### **Query Statistics**
Current implementation supports:
- ✅ **Pagination:** Limit/offset based
- ✅ **Filtering:** By analysis type
- ✅ **Sorting:** By creation date (newest first)
- ✅ **Media associations:** Images and documents linked
- ✅ **Full-text search:** Via JSONB queries (if needed)

---

## 🚀 Missing Features to Add

### **1️⃣ Yield Calculator Storage**
The Smart Yield Calculator currently doesn't have dedicated database storage. Consider adding:

```sql
CREATE TABLE yield_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  calculation_inputs JSONB NOT NULL, -- Input parameters
  calculation_result JSONB NOT NULL, -- Full yield analysis
  crop_type VARCHAR(100),
  farm_size DECIMAL(10,2),
  location VARCHAR(200),
  confidence DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **2️⃣ Search and Filtering**
Add search capabilities:
```javascript
GET /api/v1/enhanced-plant/history?search=rose&type=plant_identification
GET /api/v1/enhanced-plant/history?location=nakuru&dateFrom=2025-01-01
```

### **3️⃣ Export Functionality**
```javascript
GET /api/v1/enhanced-plant/export?format=pdf&analysisIds=uuid1,uuid2
```

---

## 📋 Summary

- ✅ **3 tables** actively storing AI analysis results
- ✅ **Full pagination** with limit/offset support
- ✅ **Media associations** for images and documents
- ✅ **JSONB storage** for flexible analysis results
- ✅ **User isolation** - each user sees only their data
- ✅ **Performance optimized** with proper indexes
- 🔄 **Yield calculator storage** needs to be added
- 🔄 **Advanced search/filtering** can be enhanced

**Your database structure supports comprehensive historical analysis tracking with efficient pagination! 📊🌾**