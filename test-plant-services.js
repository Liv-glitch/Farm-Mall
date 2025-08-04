#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'betttonny966@gmail.com',
  password: 'Password123'
};

class PlantServicesTest {
  constructor() {
    this.authToken = null;
    this.userId = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${timestamp} ${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Authenticate user
  async authenticate() {
    try {
      this.log('🔐 Authenticating user...');
      
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        identifier: TEST_USER.email,
        password: TEST_USER.password
      });

      if (response.data.success && response.data.data.tokens.accessToken) {
        this.authToken = response.data.data.tokens.accessToken;
        this.userId = response.data.data.user.id;
        this.log(`✅ Authentication successful! User ID: ${this.userId}`, 'success');
        return true;
      } else {
        throw new Error('Authentication failed - no token received');
      }
    } catch (error) {
      this.log(`❌ Authentication failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Get test image from uploads
  getTestImage() {
    const testImagePaths = [
      'uploads/temp/image-1751457415865-401770578.jpg',
      'uploads/test-images/SpecField_11.jpg',
      'uploads/test-images/plague.jpg'
    ];

    for (const imagePath of testImagePaths) {
      try {
        if (fs.existsSync(imagePath)) {
          this.log(`📸 Using test image: ${imagePath}`);
          return fs.readFileSync(imagePath);
        }
      } catch (error) {
        this.log(`Warning: Could not read ${imagePath}: ${error.message}`, 'warning');
      }
    }

    // Fallback to a simple test image buffer
    this.log('📸 Using fallback test image buffer', 'warning');
    return Buffer.from('test-image-data');
  }

  // Test 1: Plant Identification
  async testPlantIdentification() {
    try {
      this.log('\n🌱 TEST: Plant Identification with Gemini AI', 'info');
      console.log('=' .repeat(60));
      
      const formData = new FormData();
      formData.append('image1', this.getTestImage(), 'test-plant.jpg');
      formData.append('location', 'Central Kenya');
      formData.append('plant_type', 'crop');
      formData.append('latitude', '-1.2921');
      formData.append('longitude', '36.8219');

      this.log('📤 Sending plant identification request...');
      const startTime = Date.now();

      const response = await axios.post(`${BASE_URL}/api/v1/enhanced-plant/identify`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.authToken}`
        },
        timeout: 60000 // 1 minute timeout
      });

      const processingTime = Date.now() - startTime;

      if (response.data.success) {
        this.log(`✅ Plant identification successful! (${processingTime}ms)`, 'success');
        this.log(`🤖 Provider: ${response.data.provider}`, 'info');
        
        if (response.data.data && response.data.data.plants && response.data.data.plants.length > 0) {
          const plant = response.data.data.plants[0];
          console.log('\n📋 IDENTIFICATION RESULTS:');
          console.log(`🏷️  Scientific Name: ${plant.scientificName}`);
          console.log(`🌿 Common Name: ${plant.commonName}`);
          console.log(`👨‍🔬 Family: ${plant.family}`);
          console.log(`🎯 Confidence: ${(plant.confidence * 100).toFixed(1)}%`);
          console.log(`📝 Description: ${plant.description?.substring(0, 100)}...`);
          
          if (plant.cultivationTips && plant.cultivationTips.length > 0) {
            console.log(`💡 Cultivation Tips: ${plant.cultivationTips.length} tips provided`);
          }
        }

        if (response.data.enhanced_features) {
          console.log('\n🚀 ENHANCED FEATURES:');
          Object.entries(response.data.enhanced_features).forEach(([key, value]) => {
            console.log(`   ${value ? '✅' : '❌'} ${key.replace(/_/g, ' ')}`);
          });
        }

        return { success: true, data: response.data, processingTime };
      } else {
        this.log(`⚠️ Plant identification completed with issues: ${response.data.message}`, 'warning');
        return { success: false, message: response.data.message };
      }

    } catch (error) {
      this.log(`❌ Plant identification failed: ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Test 2: Plant Health Assessment
  async testPlantHealth() {
    try {
      this.log('\n🏥 TEST: Plant Health Assessment with Gemini AI', 'info');
      console.log('=' .repeat(60));
      
      const formData = new FormData();
      formData.append('image1', this.getTestImage(), 'test-plant-health.jpg');
      formData.append('location', 'Nakuru, Kenya');
      formData.append('plant_type', 'maize');
      formData.append('symptoms', 'yellowing leaves, brown spots');

      this.log('📤 Sending plant health assessment request...');
      const startTime = Date.now();

      const response = await axios.post(`${BASE_URL}/api/v1/enhanced-plant/health`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.authToken}`
        },
        timeout: 60000 // 1 minute timeout
      });

      const processingTime = Date.now() - startTime;

      if (response.data.success) {
        this.log(`✅ Plant health assessment successful! (${processingTime}ms)`, 'success');
        this.log(`🤖 Provider: ${response.data.provider}`, 'info');
        
        if (response.data.data && response.data.data.healthStatus) {
          const health = response.data.data.healthStatus;
          console.log('\n🏥 HEALTH ASSESSMENT RESULTS:');
          console.log(`🎯 Overall Status: ${health.overall}`);
          console.log(`💚 Is Healthy: ${health.isHealthy ? 'Yes' : 'No'}`);
          console.log(`📊 Health Score: ${health.healthScore}/100`);
          console.log(`⚠️  Urgency: ${health.urgency}`);
          console.log(`🎯 Confidence: ${(health.confidence * 100).toFixed(1)}%`);
          console.log(`📝 Assessment: ${health.assessment?.substring(0, 150)}...`);
        }

        if (response.data.data && response.data.data.diseases && response.data.data.diseases.length > 0) {
          console.log('\n🦠 DISEASES DETECTED:');
          response.data.data.diseases.forEach((disease, index) => {
            console.log(`${index + 1}. ${disease.name} (${disease.type})`);
            console.log(`   Severity: ${disease.severity}`);
            console.log(`   Confidence: ${(disease.confidence * 100).toFixed(1)}%`);
            if (disease.treatment && disease.treatment.immediate) {
              console.log(`   Immediate Treatment: ${disease.treatment.immediate.length} actions`);
            }
          });
        }

        if (response.data.enhanced_features) {
          console.log('\n🚀 ENHANCED FEATURES:');
          Object.entries(response.data.enhanced_features).forEach(([key, value]) => {
            console.log(`   ${value ? '✅' : '❌'} ${key.replace(/_/g, ' ')}`);
          });
        }

        return { success: true, data: response.data, processingTime };
      } else {
        this.log(`⚠️ Plant health assessment completed with issues: ${response.data.message}`, 'warning');
        return { success: false, message: response.data.message };
      }

    } catch (error) {
      this.log(`❌ Plant health assessment failed: ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Test 3: Service Health Check
  async testHealthCheck() {
    try {
      this.log('\n🩺 TEST: Service Health Check', 'info');
      console.log('=' .repeat(60));

      const response = await axios.get(`${BASE_URL}/api/v1/enhanced-plant/health-check`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (response.data.success) {
        this.log(`✅ Health check successful!`, 'success');
        console.log('\n🔧 SERVICE STATUS:');
        console.log(`📡 Provider: ${response.data.status.provider}`);
        console.log(`🤖 Model: ${response.data.status.model}`);
        console.log(`✅ Enabled: ${response.data.status.enabled}`);
        console.log(`⚙️  Configured: ${response.data.status.configured}`);
        
        if (response.data.status.features) {
          console.log('\n🚀 AVAILABLE FEATURES:');
          Object.entries(response.data.status.features).forEach(([key, value]) => {
            console.log(`   ${value ? '✅' : '❌'} ${key.replace(/_/g, ' ')}`);
          });
        }

        return { success: true, data: response.data };
      }

    } catch (error) {
      this.log(`❌ Health check failed: ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Run all plant service tests
  async runAllTests() {
    this.log('🚀 Starting Plant Services Test Suite...', 'info');
    this.log(`📡 Testing against: ${BASE_URL}`, 'info');
    this.log(`👤 Test user: ${TEST_USER.email}`, 'info');
    
    // Authenticate first
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      this.log('❌ Authentication failed - stopping tests', 'error');
      return;
    }

    await this.sleep(1000);

    // Run tests
    const results = {
      healthCheck: await this.testHealthCheck(),
      plantIdentification: await this.testPlantIdentification(),
      plantHealth: await this.testPlantHealth()
    };

    // Summary
    this.log('\n📊 TEST SUMMARY', 'info');
    console.log('=' .repeat(50));
    
    const tests = Object.entries(results);
    const passedTests = tests.filter(([_, result]) => result?.success).length;
    const totalTests = tests.length;

    tests.forEach(([testName, result]) => {
      const status = result?.success ? '✅ PASS' : '❌ FAIL';
      const processingTime = result?.processingTime ? ` (${result.processingTime}ms)` : '';
      this.log(`${status} ${testName.replace(/([A-Z])/g, ' $1').trim()}${processingTime}`, 
        result?.success ? 'success' : 'error');
    });

    this.log(`\n🎯 FINAL RESULT: ${passedTests}/${totalTests} tests passed`, 
      passedTests === totalTests ? 'success' : 'warning');

    console.log('\n📋 CURL EXAMPLES FOR FRONTEND:');
    console.log('\n1️⃣  Plant Identification:');
    console.log('curl -X POST http://localhost:3000/api/v1/enhanced-plant/identify \\');
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  -F "image1=@/path/to/plant/image.jpg" \\');
    console.log('  -F "location=Central Kenya" \\');
    console.log('  -F "plant_type=crop"');

    console.log('\n2️⃣  Plant Health Assessment:');
    console.log('curl -X POST http://localhost:3000/api/v1/enhanced-plant/health \\');
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  -F "image1=@/path/to/plant/image.jpg" \\');
    console.log('  -F "location=Nakuru, Kenya" \\');
    console.log('  -F "plant_type=maize" \\');
    console.log('  -F "symptoms=yellowing leaves"');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new PlantServicesTest();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = PlantServicesTest;