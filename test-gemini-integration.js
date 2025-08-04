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

class GeminiIntegrationTest {
  constructor() {
    this.authToken = null;
    this.userId = null;
    this.results = {
      auth: null,
      plantId: null,
      plantHealth: null,
      soilAnalysis: null,
      yieldCalc: null,
      healthCheck: null,
      dbVerification: null
    };
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

  // Test 1: User Authentication
  async testAuthentication() {
    try {
      this.log('🔐 Testing user authentication...');
      
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        identifier: TEST_USER.email,
        password: TEST_USER.password
      });

      if (response.data.success && response.data.data.tokens.accessToken) {
        this.authToken = response.data.data.tokens.accessToken;
        this.userId = response.data.data.user.id;
        this.results.auth = { success: true, userId: this.userId };
        this.log(`✅ Authentication successful! User ID: ${this.userId}`, 'success');
        return true;
      } else {
        throw new Error('Authentication failed - no token received');
      }
    } catch (error) {
      this.results.auth = { success: false, error: error.message };
      this.log(`❌ Authentication failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 2: Service Health Check
  async testHealthCheck() {
    try {
      this.log('🩺 Testing service health check...');
      
      const response = await axios.get(`${BASE_URL}/api/v1/enhanced-plant/health-check`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      this.results.healthCheck = response.data;
      this.log(`✅ Health check passed. Gemini enabled: ${response.data.status.enabled}`, 'success');
      return true;
    } catch (error) {
      this.results.healthCheck = { success: false, error: error.message };
      this.log(`❌ Health check failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Create test images
  createTestPlantImage() {
    // Use an existing test image file instead of generating a minimal buffer
    // This ensures the image is large enough for Gemini to process
    const testImagePath = 'uploads/temp/image-1751457415865-401770578.jpg';
    
    try {
      if (fs.existsSync(testImagePath)) {
        return fs.readFileSync(testImagePath);
      }
    } catch (error) {
      this.log(`Warning: Could not read test image file: ${error.message}`, 'warning');
    }
    
    // Fallback: Create a larger, more realistic test PNG (100x100 pixels)
    // This creates a simple green square that should be acceptable to Gemini
    const width = 100;
    const height = 100;
    const bytesPerPixel = 3; // RGB
    
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk (image header)
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);     // Width
    ihdrData.writeUInt32BE(height, 4);    // Height
    ihdrData.writeUInt8(8, 8);            // Bit depth
    ihdrData.writeUInt8(2, 9);            // Color type (RGB)
    ihdrData.writeUInt8(0, 10);           // Compression method
    ihdrData.writeUInt8(0, 11);           // Filter method
    ihdrData.writeUInt8(0, 12);           // Interlace method
    
    const ihdrCrc = this.crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x0D]), // Length
      Buffer.from('IHDR'),
      ihdrData,
      ihdrCrc
    ]);
    
    // Create image data (simple green square)
    const imageData = Buffer.alloc(height * (width * bytesPerPixel + 1)); // +1 for filter byte per row
    for (let y = 0; y < height; y++) {
      const rowStart = y * (width * bytesPerPixel + 1);
      imageData[rowStart] = 0; // Filter type (None)
      for (let x = 0; x < width; x++) {
        const pixelStart = rowStart + 1 + x * bytesPerPixel;
        imageData[pixelStart] = 0x00;     // Red
        imageData[pixelStart + 1] = 0x80; // Green
        imageData[pixelStart + 2] = 0x00; // Blue
      }
    }
    
    // Compress the image data (simplified - just use raw data)
    const compressedData = imageData; // In real PNG, this would be zlib compressed
    
    // IDAT chunk (image data)
    const idatCrc = this.crc32(Buffer.concat([Buffer.from('IDAT'), compressedData]));
    const idatChunk = Buffer.concat([
      Buffer.alloc(4), // Length (will be filled)
      Buffer.from('IDAT'),
      compressedData,
      idatCrc
    ]);
    idatChunk.writeUInt32BE(compressedData.length, 0);
    
    // IEND chunk (end of image)
    const iendCrc = this.crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // Length
      Buffer.from('IEND'),
      iendCrc
    ]);
    
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  }
  
  // Simple CRC32 implementation for PNG chunks
  crc32(data) {
    const crcTable = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[i] = c;
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    
    const result = Buffer.alloc(4);
    result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
    return result;
  }

  createTestPDF() {
    // Create a minimal PDF buffer for soil analysis testing
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Soil Test Report) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000120 00000 n 
0000000213 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
308
%%EOF`;
    return Buffer.from(pdfContent);
  }

  // Test 3: Plant Identification
  async testPlantIdentification() {
    try {
      this.log('🌱 Testing Gemini plant identification...');
      
      const formData = new FormData();
      formData.append('image1', this.createTestPlantImage(), 'test-plant.png');
      formData.append('location', 'Central Kenya');
      formData.append('plant_type', 'crop');
      formData.append('latitude', '-1.2921');
      formData.append('longitude', '36.8219');

      const response = await axios.post(`${BASE_URL}/api/v1/enhanced-plant/identify`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.authToken}`
        }
      });

      this.results.plantId = response.data;
      if (response.data.success) {
        this.log(`✅ Plant identification successful! Provider: ${response.data.provider}`, 'success');
        if (response.data.provider === 'gemini') {
          this.log(`🤖 Gemini AI analysis completed with enhanced features`, 'success');
        }
      } else {
        this.log(`⚠️ Plant identification completed but with issues: ${response.data.message}`, 'warning');
      }
      return true;
    } catch (error) {
      this.results.plantId = { success: false, error: error.message };
      this.log(`❌ Plant identification failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 4: Plant Health Assessment
  async testPlantHealth() {
    try {
      this.log('🏥 Testing Gemini plant health assessment...');
      
      const formData = new FormData();
      formData.append('image1', this.createTestPlantImage(), 'test-plant-health.png');
      formData.append('location', 'Nakuru, Kenya');
      formData.append('plant_type', 'maize');
      formData.append('symptoms', 'yellowing leaves');

      const response = await axios.post(`${BASE_URL}/api/v1/enhanced-plant/health`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.authToken}`
        }
      });

      this.results.plantHealth = response.data;
      if (response.data.success) {
        this.log(`✅ Plant health assessment successful! Provider: ${response.data.provider}`, 'success');
      } else {
        this.log(`⚠️ Plant health assessment completed but with issues: ${response.data.message}`, 'warning');
      }
      return true;
    } catch (error) {
      this.results.plantHealth = { success: false, error: error.message };
      this.log(`❌ Plant health assessment failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 5: Soil Analysis
  async testSoilAnalysis() {
    try {
      this.log('🌱 Testing Gemini soil analysis...');
      
      const formData = new FormData();
      formData.append('document', this.createTestPDF(), 'soil-test-report.pdf');
      formData.append('location', 'Eldoret, Kenya');
      formData.append('crop_type', 'wheat');
      formData.append('farm_size', '5');
      formData.append('budget', 'medium');

      const response = await axios.post(`${BASE_URL}/api/v1/enhanced-plant/soil`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.authToken}`
        }
      });

      this.results.soilAnalysis = response.data;
      if (response.data.success) {
        this.log(`✅ Soil analysis successful!`, 'success');
      } else {
        this.log(`⚠️ Soil analysis completed but with issues: ${response.data.message}`, 'warning');
      }
      return true;
    } catch (error) {
      this.results.soilAnalysis = { success: false, error: error.message };
      this.log(`❌ Soil analysis failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 6: Yield Calculation
  async testYieldCalculation() {
    try {
      this.log('📊 Testing smart yield calculation...');
      
      const yieldData = {
        cropType: 'maize',
        variety: 'H614',
        farmSize: 2.5,
        location: 'Nakuru',
        farmingSystem: 'mixed',
        irrigationType: 'rainfed',
        fertilizationLevel: 'medium',
        season: 'main',
        inputBudget: 50000,
        targetMarket: 'local'
      };

      const response = await axios.post(`${BASE_URL}/api/v1/enhanced-plant/yield`, yieldData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`
        }
      });

      this.results.yieldCalc = response.data;
      if (response.data.success) {
        this.log(`✅ Yield calculation successful!`, 'success');
      } else {
        this.log(`⚠️ Yield calculation completed but with issues: ${response.data.message}`, 'warning');
      }
      return true;
    } catch (error) {
      this.results.yieldCalc = { success: false, error: error.message };
      this.log(`❌ Yield calculation failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 7: Database Verification
  async testDatabaseStorage() {
    try {
      this.log('🗄️ Testing database storage verification...');
      
      const response = await axios.get(`${BASE_URL}/api/v1/enhanced-plant/history?limit=10`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      this.results.dbVerification = response.data;
      if (response.data.success && response.data.data) {
        this.log(`✅ Database verification successful! Found ${response.data.total} analysis records`, 'success');
      } else {
        this.log(`⚠️ Database verification completed: ${response.data.message}`, 'warning');
      }
      return true;
    } catch (error) {
      this.results.dbVerification = { success: false, error: error.message };
      this.log(`❌ Database verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Generate comprehensive test report
  generateReport() {
    this.log('\n🔬 GEMINI INTEGRATION TEST REPORT', 'info');
    this.log('=' .repeat(50), 'info');
    
    const tests = [
      { name: 'Authentication', result: this.results.auth },
      { name: 'Health Check', result: this.results.healthCheck },
      { name: 'Plant Identification', result: this.results.plantId },
      { name: 'Plant Health Assessment', result: this.results.plantHealth },
      { name: 'Soil Analysis', result: this.results.soilAnalysis },
      { name: 'Yield Calculation', result: this.results.yieldCalc },
      { name: 'Database Verification', result: this.results.dbVerification }
    ];

    let passed = 0;
    let total = tests.length;

    tests.forEach(test => {
      const status = test.result?.success ? '✅ PASS' : '❌ FAIL';
      this.log(`${status} ${test.name}`, test.result?.success ? 'success' : 'error');
      if (test.result?.success) passed++;
    });

    this.log(`\n📊 TEST SUMMARY: ${passed}/${total} tests passed`, passed === total ? 'success' : 'warning');
    
    if (this.results.healthCheck?.status) {
      this.log(`\n🤖 GEMINI STATUS:`, 'info');
      this.log(`- Enabled: ${this.results.healthCheck.status.enabled}`, 'info');
      this.log(`- Model: ${this.results.healthCheck.status.model}`, 'info');
      this.log(`- Features: ${Object.keys(this.results.healthCheck.status.features || {}).join(', ')}`, 'info');
    }

    // Save detailed results to file
    const reportPath = path.join(__dirname, 'gemini-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`📄 Detailed results saved to: ${reportPath}`, 'info');
  }

  // Main test execution
  async runAllTests() {
    this.log('🚀 Starting Gemini Integration Test Suite...', 'info');
    this.log(`📡 Testing against: ${BASE_URL}`, 'info');
    this.log(`👤 Test user: ${TEST_USER.email}`, 'info');
    
    // Run tests in sequence
    const authSuccess = await this.testAuthentication();
    if (!authSuccess) {
      this.log('❌ Authentication failed - stopping tests', 'error');
      this.generateReport();
      return;
    }

    await this.sleep(1000); // Brief pause between tests

    await this.testHealthCheck();
    await this.sleep(1000);
    
    await this.testPlantIdentification();
    await this.sleep(2000); // Longer pause for AI processing
    
    await this.testPlantHealth();
    await this.sleep(2000);
    
    await this.testSoilAnalysis();
    await this.sleep(2000);
    
    await this.testYieldCalculation();
    await this.sleep(1000);
    
    await this.testDatabaseStorage();

    this.generateReport();
  }
}

// Run the tests
if (require.main === module) {
  const tester = new GeminiIntegrationTest();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = GeminiIntegrationTest;