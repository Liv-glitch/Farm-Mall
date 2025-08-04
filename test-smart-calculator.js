#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'betttonny966@gmail.com',
  password: 'Password123'
};

class SmartCalculatorTest {
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

  // Test 1: Basic calculation with minimal inputs
  async testBasicCalculation() {
    this.log('\n📊 TEST 1: Basic Yield Calculation (Minimal Inputs)', 'info');
    console.log('=' .repeat(60));

    const basicInputs = {
      cropType: 'maize',
      farmSize: 2.5,
      location: 'Nakuru'
    };

    return await this.performCalculation('Basic Test', basicInputs);
  }

  // Test 2: Comprehensive calculation with all inputs
  async testComprehensiveCalculation() {
    this.log('\n📊 TEST 2: Comprehensive Yield Calculation (All Inputs)', 'info');
    console.log('=' .repeat(60));

    const comprehensiveInputs = {
      cropType: 'potato',
      variety: 'Shangi',
      farmSize: 5,
      location: 'Central Kenya',
      farmingSystem: 'mixed',
      irrigationType: 'drip',
      fertilizationLevel: 'high',
      pestManagement: 'ipm',
      season: 'main',
      inputBudget: 100000,
      targetMarket: 'regional',
      soilData: {
        ph: 6.5,
        organicMatter: 3.2,
        nitrogen: 45,
        phosphorus: 25,
        potassium: 180,
        texture: 'clay loam',
        drainage: 'well-drained'
      },
      previousYields: [
        { year: 2023, yield: 12000, practices: 'conventional farming' },
        { year: 2022, yield: 10500, practices: 'organic farming trial' }
      ]
    };

    return await this.performCalculation('Comprehensive Test', comprehensiveInputs);
  }

  // Test 3: Different crop types
  async testDifferentCrops() {
    this.log('\n📊 TEST 3: Testing Different Crop Types', 'info');
    console.log('=' .repeat(60));

    const crops = [
      { cropType: 'wheat', variety: 'Kenya Mavuno', location: 'Eldoret', farmSize: 10 },
      { cropType: 'beans', variety: 'Rose Coco', location: 'Meru', farmSize: 1.5 },
      { cropType: 'tomato', variety: 'Anna F1', location: 'Kiambu', farmSize: 0.5 }
    ];

    const results = [];
    for (const crop of crops) {
      const result = await this.performCalculation(`${crop.cropType} Test`, crop);
      results.push(result);
      await this.sleep(2000); // Pause between requests
    }

    return results;
  }

  // Perform actual calculation request
  async performCalculation(testName, inputs) {
    try {
      this.log(`🌾 Testing: ${testName}`);
      this.log(`📋 Inputs: ${JSON.stringify(inputs, null, 2)}`);

      const startTime = Date.now();
      
      const response = await axios.post(`${BASE_URL}/api/v1/enhanced-plant/yield`, inputs, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const processingTime = Date.now() - startTime;

      if (response.data.success) {
        this.log(`✅ ${testName} successful! (${processingTime}ms)`, 'success');
        
        const data = response.data.data;
        console.log('\n📈 YIELD PREDICTION RESULTS:');
        console.log(`🎯 Estimated Yield: ${data.estimatedYield.range.mostLikely} ${data.estimatedYield.unit}`);
        console.log(`📊 Range: ${data.estimatedYield.range.minimum} - ${data.estimatedYield.range.maximum} ${data.estimatedYield.unit}`);
        console.log(`💰 Net Profit (Realistic): KES ${data.economicProjection.netProfit.realistic.toLocaleString()}`);
        console.log(`📋 ROI: ${(data.economicProjection.roi * 100).toFixed(1)}%`);
        console.log(`⚠️  Overall Risk: ${data.riskAssessment.overallRisk}`);
        console.log(`🏆 Confidence: ${(data.confidence * 100).toFixed(1)}%`);

        return { success: true, data, processingTime };
      } else {
        this.log(`❌ ${testName} failed: ${response.data.message}`, 'error');
        return { success: false, error: response.data.message };
      }

    } catch (error) {
      this.log(`❌ ${testName} error: ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting Smart Yield Calculator Test Suite...', 'info');
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
      basic: await this.testBasicCalculation(),
      comprehensive: await this.testComprehensiveCalculation(), 
      multiCrop: await this.testDifferentCrops()
    };

    // Summary
    this.log('\n📊 TEST SUMMARY', 'info');
    console.log('=' .repeat(50));
    
    const totalTests = 1 + 1 + results.multiCrop.length;
    const passedTests = [results.basic, results.comprehensive, ...results.multiCrop]
      .filter(r => r?.success).length;

    this.log(`✅ Passed: ${passedTests}/${totalTests} tests`, passedTests === totalTests ? 'success' : 'warning');
    
    console.log('\n💡 USAGE EXAMPLES:');
    console.log('Basic: curl -X POST http://localhost:3000/api/v1/enhanced-plant/yield \\');
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\'); 
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"cropType":"maize","farmSize":2.5,"location":"Nakuru"}\'');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new SmartCalculatorTest();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = SmartCalculatorTest;