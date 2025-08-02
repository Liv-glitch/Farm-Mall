const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'betttonny966@gmail.com';
const TEST_PASSWORD = 'Password123';

let authToken = '';
let userId = '';

// Test results tracking
const testResults = {
  auth: false,
  healthCheck: false,
  plantIdentification: false,
  plantHealth: false,
  soilAnalysis: false,
  historyRetrieval: false,
  databaseStorage: false
};

console.log('🧪 Starting Gemini Integration Test Suite');
console.log('=====================================\n');

async function authenticate() {
  try {
    console.log('🔐 Testing Authentication...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      userId = response.data.data.user.id;
      testResults.auth = true;
      console.log('✅ Authentication successful');
      console.log(`   User ID: ${userId}`);
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
    } else {
      throw new Error('Authentication failed: ' + response.data.message);
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testHealthCheck() {
  try {
    console.log('\n🏥 Testing Service Health Check...');
    
    const response = await axios.get(`${API_BASE_URL}/enhanced-plant/health-check`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      testResults.healthCheck = true;
      console.log('✅ Health check passed');
      console.log('   Service Status:', JSON.stringify(response.data.status, null, 2));
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.data?.message || error.message);
  }
}

async function testPlantIdentification() {
  try {
    console.log('\n🌱 Testing Plant Identification with Gemini...');
    
    const imagePath = path.join(__dirname, 'uploads/test-images/SpecField_11.jpg');
    
    if (!fs.existsSync(imagePath)) {
      throw new Error('Test image not found: ' + imagePath);
    }

    const formData = new FormData();
    formData.append('image1', fs.createReadStream(imagePath));
    formData.append('location', 'Nakuru');
    formData.append('plant_type', 'crop');
    formData.append('latitude', '-0.3031');
    formData.append('longitude', '36.0800');
    formData.append('similar_images', 'true');

    const response = await axios.post(`${API_BASE_URL}/enhanced-plant/identify`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      },
      timeout: 60000 // 60 seconds timeout for AI processing
    });

    if (response.data.success) {
      testResults.plantIdentification = true;
      console.log('✅ Plant identification successful');
      console.log(`   Provider: ${response.data.provider}`);
      console.log(`   Enhanced Features: ${JSON.stringify(response.data.enhanced_features)}`);
      
      if (response.data.metadata) {
        console.log(`   Analysis ID: ${response.data.metadata.analysisId}`);
        console.log(`   Media ID: ${response.data.metadata.mediaId}`);
        console.log(`   Processing Time: ${response.data.metadata.processingTime}ms`);
        console.log(`   Confidence: ${response.data.metadata.confidence}`);
      }

      // Show some plant identification results
      if (response.data.data?.result?.classification?.suggestions) {
        const firstSuggestion = response.data.data.result.classification.suggestions[0];
        console.log(`   Identified Plant: ${firstSuggestion.name}`);
        console.log(`   Confidence: ${(firstSuggestion.probability * 100).toFixed(1)}%`);
      }

      return response.data.metadata?.analysisId;
    } else {
      throw new Error('Plant identification failed: ' + response.data.message);
    }
  } catch (error) {
    console.log('❌ Plant identification failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testPlantHealth() {
  try {
    console.log('\n🏥 Testing Plant Health Assessment with Gemini...');
    
    const imagePath = path.join(__dirname, 'uploads/test-images/plague.jpg');
    
    if (!fs.existsSync(imagePath)) {
      throw new Error('Test image not found: ' + imagePath);
    }

    const formData = new FormData();
    formData.append('image1', fs.createReadStream(imagePath));
    formData.append('location', 'Central Kenya');
    formData.append('plant_type', 'potato');
    formData.append('symptoms', 'Visible disease symptoms on leaves');
    formData.append('latitude', '-1.0332');
    formData.append('longitude', '37.0724');

    const response = await axios.post(`${API_BASE_URL}/enhanced-plant/health`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      },
      timeout: 60000
    });

    if (response.data.success) {
      testResults.plantHealth = true;
      console.log('✅ Plant health assessment successful');
      console.log(`   Provider: ${response.data.provider}`);
      console.log(`   Enhanced Features: ${JSON.stringify(response.data.enhanced_features)}`);
      
      if (response.data.metadata) {
        console.log(`   Analysis ID: ${response.data.metadata.analysisId}`);
        console.log(`   Processing Time: ${response.data.metadata.processingTime}ms`);
      }

      // Show health assessment results
      if (response.data.data?.result?.is_healthy) {
        console.log(`   Plant Health: ${response.data.data.result.is_healthy.binary ? 'Healthy' : 'Unhealthy'}`);
        console.log(`   Health Confidence: ${(response.data.data.result.is_healthy.probability * 100).toFixed(1)}%`);
      }

      if (response.data.data?.result?.disease?.suggestions?.length > 0) {
        const firstDisease = response.data.data.result.disease.suggestions[0];
        console.log(`   Detected Issue: ${firstDisease.name}`);
        console.log(`   Disease Confidence: ${(firstDisease.probability * 100).toFixed(1)}%`);
      }

      return response.data.metadata?.analysisId;
    } else {
      throw new Error('Plant health assessment failed: ' + response.data.message);
    }
  } catch (error) {
    console.log('❌ Plant health assessment failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testSoilAnalysis() {
  try {
    console.log('\n🌱 Testing Soil Analysis with PDF Processing...');
    
    const documentPath = path.join(__dirname, 'uploads/receipt.pdf');
    
    if (!fs.existsSync(documentPath)) {
      console.log('⚠️  Test PDF not found, skipping soil analysis test');
      return null;
    }

    const formData = new FormData();
    formData.append('document', fs.createReadStream(documentPath));
    formData.append('location', 'Nakuru');
    formData.append('crop_type', 'maize');
    formData.append('farm_size', '2.5');
    formData.append('budget', 'medium');

    const response = await axios.post(`${API_BASE_URL}/enhanced-plant/soil`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      },
      timeout: 90000 // 90 seconds for PDF processing
    });

    if (response.data.success) {
      testResults.soilAnalysis = true;
      console.log('✅ Soil analysis successful');
      console.log(`   Provider: ${response.data.provider}`);
      console.log(`   Features: ${JSON.stringify(response.data.features)}`);
      
      // Show some soil analysis results
      if (response.data.data?.basicProperties) {
        console.log(`   Soil pH: ${response.data.data.basicProperties.ph}`);
        console.log(`   Organic Matter: ${response.data.data.basicProperties.organicMatter}%`);
      }

      if (response.data.data?.metadata) {
        console.log(`   Analysis ID: ${response.data.data.metadata.analysisId}`);
        console.log(`   Processing Time: ${response.data.data.metadata.processingTime}ms`);
      }

      return response.data.data?.metadata?.analysisId;
    } else {
      throw new Error('Soil analysis failed: ' + response.data.message);
    }
  } catch (error) {
    console.log('❌ Soil analysis failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testHistoryRetrieval() {
  try {
    console.log('\n📊 Testing Analysis History Retrieval...');
    
    const response = await axios.get(`${API_BASE_URL}/enhanced-plant/history?limit=10`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      testResults.historyRetrieval = true;
      console.log('✅ History retrieval successful');
      console.log(`   Total Records: ${response.data.data.length}`);
      
      response.data.data.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.type} - ${new Date(record.createdAt).toLocaleString()}`);
        if (record.confidence) {
          console.log(`      Confidence: ${record.confidence}`);
        }
        if (record.media) {
          console.log(`      Media: ${record.media.fileName}`);
        }
      });

      return response.data.data;
    } else {
      throw new Error('History retrieval failed: ' + response.data.message);
    }
  } catch (error) {
    console.log('❌ History retrieval failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testDatabaseStorage(analysisIds) {
  try {
    console.log('\n💾 Testing Database Storage and Retrieval...');
    
    let storageVerified = 0;

    // Test each analysis ID if provided
    for (const analysisId of analysisIds.filter(Boolean)) {
      try {
        // Try to get the specific analysis
        const response = await axios.get(`${API_BASE_URL}/enhanced-plant/history`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          params: {
            limit: 50
          }
        });

        if (response.data.success) {
          const foundRecord = response.data.data.find(record => record.id === analysisId);
          if (foundRecord) {
            storageVerified++;
            console.log(`   ✅ Analysis ${analysisId} found in database`);
            console.log(`      Type: ${foundRecord.type}`);
            console.log(`      Created: ${new Date(foundRecord.createdAt).toLocaleString()}`);
          } else {
            console.log(`   ⚠️  Analysis ${analysisId} not found in history`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Failed to verify storage for ${analysisId}`);
      }
    }

    if (storageVerified > 0) {
      testResults.databaseStorage = true;
      console.log(`✅ Database storage verified for ${storageVerified} analyses`);
    } else {
      console.log('❌ No analyses found in database storage');
    }

  } catch (error) {
    console.log('❌ Database storage test failed:', error.message);
  }
}

async function generateTestReport() {
  console.log('\n📋 Test Results Summary');
  console.log('=====================');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  
  Object.entries(testResults).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1')}`);
  });
  
  console.log(`\nOverall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Gemini integration is working correctly.');
    console.log('✅ AI responses are being generated');
    console.log('✅ Results are being stored in database');
    console.log('✅ Frontend can retrieve analysis history');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Test with your actual frontend application');
  console.log('2. Monitor database records in your admin panel');
  console.log('3. Check Supabase storage for uploaded media files');
  console.log('4. Test subscription-based access controls');
}

// Main test execution
async function runTests() {
  try {
    // Start server check
    console.log('🚀 Checking if server is running...');
    try {
      await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Server is running\n');
    } catch (error) {
      console.log('❌ Server is not running. Please start with: npm run dev');
      process.exit(1);
    }

    // Run all tests
    await authenticate();
    await testHealthCheck();
    
    const analysisIds = [];
    
    const plantIdAnalysisId = await testPlantIdentification();
    if (plantIdAnalysisId) analysisIds.push(plantIdAnalysisId);
    
    const healthAnalysisId = await testPlantHealth();
    if (healthAnalysisId) analysisIds.push(healthAnalysisId);
    
    const soilAnalysisId = await testSoilAnalysis();
    if (soilAnalysisId) analysisIds.push(soilAnalysisId);
    
    await testHistoryRetrieval();
    await testDatabaseStorage(analysisIds);
    
    await generateTestReport();
    
  } catch (error) {
    console.log('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the test suite
runTests().catch(console.error);