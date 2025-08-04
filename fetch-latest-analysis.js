#!/usr/bin/env node

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || {
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'farmmall',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: false
});

// Test user ID from our tests
const TEST_USER_ID = '9ec951f8-47e1-4a64-906d-e5118681cb7e';

class AnalysisRetriever {
  constructor() {
    this.sequelize = sequelize;
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

  async connectToDatabase() {
    try {
      await this.sequelize.authenticate();
      this.log('✅ Database connection established', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async getLatestPlantIdentification() {
    try {
      this.log('🔍 Fetching latest plant identification...', 'info');
      
      const [results] = await this.sequelize.query(`
        SELECT 
          id,
          user_id,
          identification_result,
          confidence_score,
          created_at,
          image_url
        FROM plant_identifications 
        WHERE user_id = :userId 
        ORDER BY created_at DESC 
        LIMIT 1
      `, {
        replacements: { userId: TEST_USER_ID },
        type: Sequelize.QueryTypes.SELECT
      });

      if (results) {
        this.log(`✅ Found plant identification from ${results.created_at}`, 'success');
        return results;
      } else {
        this.log('❌ No plant identification records found', 'warning');
        return null;
      }
    } catch (error) {
      this.log(`❌ Error fetching plant identification: ${error.message}`, 'error');
      return null;
    }
  }

  async getLatestPlantHealth() {
    try {
      this.log('🏥 Fetching latest plant health assessment...', 'info');
      
      const [results] = await this.sequelize.query(`
        SELECT 
          id,
          user_id,
          health_assessment_result,
          is_healthy,
          diseases,
          treatment_suggestions,
          created_at,
          image_url
        FROM plant_health_assessments 
        WHERE user_id = :userId 
        ORDER BY created_at DESC 
        LIMIT 1
      `, {
        replacements: { userId: TEST_USER_ID },
        type: Sequelize.QueryTypes.SELECT
      });

      if (results) {
        this.log(`✅ Found plant health assessment from ${results.created_at}`, 'success');
        return results;
      } else {
        this.log('❌ No plant health assessment records found', 'warning');
        return null;
      }
    } catch (error) {
      this.log(`❌ Error fetching plant health assessment: ${error.message}`, 'error');
      return null;
    }
  }

  displayPlantIdentification(data) {
    if (!data) return;

    console.log('\n🌱 LATEST PLANT IDENTIFICATION - GEMINI AI RESPONSE:');
    console.log('=' .repeat(70));
    console.log(`📅 Date: ${data.created_at}`);
    console.log(`🆔 Analysis ID: ${data.id}`);
    console.log(`🎯 Confidence Score: ${data.confidence_score || 'N/A'}`);
    
    if (data.identification_result) {
      const result = data.identification_result;
      
      console.log('\n📋 IDENTIFICATION DETAILS:');
      if (result.plants && result.plants.length > 0) {
        const plant = result.plants[0];
        console.log(`🏷️  Scientific Name: ${plant.scientificName || 'N/A'}`);
        console.log(`🌿 Common Name: ${plant.commonName || 'N/A'}`);
        console.log(`👨‍🔬 Family: ${plant.family || 'N/A'}`);
        console.log(`🎯 Confidence: ${((plant.confidence || 0) * 100).toFixed(1)}%`);
        
        if (plant.description) {
          console.log('\n📝 DESCRIPTION:');
          console.log(`${plant.description}`);
        }
        
        if (plant.characteristics) {
          console.log('\n🔬 CHARACTERISTICS:');
          Object.entries(plant.characteristics).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
          });
        }
        
        if (plant.cultivationTips && plant.cultivationTips.length > 0) {
          console.log('\n💡 CULTIVATION TIPS:');
          plant.cultivationTips.forEach((tip, index) => {
            console.log(`   ${index + 1}. ${tip}`);
          });
        }
        
        if (plant.regionalContext) {
          console.log('\n🇰🇪 KENYA-SPECIFIC CONTEXT:');
          console.log(`${plant.regionalContext}`);
        }
      }
      
      if (result.analysisNotes) {
        console.log('\n🧠 AI ANALYSIS NOTES:');
        console.log(`${result.analysisNotes}`);
      }
    }
  }

  displayPlantHealth(data) {
    if (!data) return;

    console.log('\n🏥 LATEST PLANT HEALTH ASSESSMENT - GEMINI AI RESPONSE:');
    console.log('=' .repeat(70));
    console.log(`📅 Date: ${data.created_at}`);
    console.log(`🆔 Analysis ID: ${data.id}`);
    console.log(`💚 Is Healthy: ${data.is_healthy ? 'Yes' : 'No'}`);
    
    if (data.health_assessment_result) {
      const result = data.health_assessment_result;
      
      if (result.healthStatus) {
        console.log('\n⚕️ HEALTH STATUS:');
        console.log(`🎯 Overall: ${result.healthStatus.overall || 'N/A'}`);
        console.log(`📊 Health Score: ${result.healthStatus.healthScore || 'N/A'}/100`);
        console.log(`⚠️  Urgency: ${result.healthStatus.urgency || 'N/A'}`);
        console.log(`🎯 Confidence: ${((result.healthStatus.confidence || 0) * 100).toFixed(1)}%`);
        
        if (result.healthStatus.assessment) {
          console.log('\n📝 ASSESSMENT:');
          console.log(`${result.healthStatus.assessment}`);
        }
      }
      
      if (result.diseases && result.diseases.length > 0) {
        console.log('\n🦠 DISEASES DETECTED:');
        result.diseases.forEach((disease, index) => {
          console.log(`\n${index + 1}. ${disease.name || 'Unknown Disease'}`);
          console.log(`   Type: ${disease.type || 'N/A'}`);
          console.log(`   Severity: ${disease.severity || 'N/A'}`);
          console.log(`   Confidence: ${((disease.confidence || 0) * 100).toFixed(1)}%`);
          
          if (disease.description) {
            console.log(`   Description: ${disease.description}`);
          }
          
          if (disease.symptoms && disease.symptoms.length > 0) {
            console.log('   Symptoms:');
            disease.symptoms.forEach(symptom => {
              console.log(`     • ${symptom}`);
            });
          }
          
          if (disease.treatment) {
            console.log('   Treatment:');
            if (disease.treatment.immediate && disease.treatment.immediate.length > 0) {
              console.log('     Immediate Actions:');
              disease.treatment.immediate.forEach(action => {
                console.log(`       • ${action}`);
              });
            }
            if (disease.treatment.organic && disease.treatment.organic.length > 0) {
              console.log('     Organic Solutions:');
              disease.treatment.organic.forEach(solution => {
                console.log(`       • ${solution}`);
              });
            }
            if (disease.treatment.chemical && disease.treatment.chemical.length > 0) {
              console.log('     Chemical Treatment:');
              disease.treatment.chemical.forEach(treatment => {
                console.log(`       • ${treatment}`);
              });
            }
          }
          
          if (disease.regionalConsiderations) {
            console.log(`   🇰🇪 Kenya-Specific Advice: ${disease.regionalConsiderations}`);
          }
        });
      }
      
      if (result.preventiveMeasures && result.preventiveMeasures.length > 0) {
        console.log('\n🛡️ PREVENTIVE MEASURES:');
        result.preventiveMeasures.forEach((measure, index) => {
          console.log(`   ${index + 1}. ${measure}`);
        });
      }
      
      if (result.followUpRecommendations && result.followUpRecommendations.length > 0) {
        console.log('\n📋 FOLLOW-UP RECOMMENDATIONS:');
        result.followUpRecommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    }
  }

  async run() {
    this.log('🚀 Fetching Latest Gemini AI Analysis Results...', 'info');
    this.log(`👤 Test User ID: ${TEST_USER_ID}`, 'info');
    
    // Connect to database
    const connected = await this.connectToDatabase();
    if (!connected) {
      process.exit(1);
    }

    try {
      // Fetch latest results
      const [plantId, plantHealth] = await Promise.all([
        this.getLatestPlantIdentification(),
        this.getLatestPlantHealth()
      ]);

      // Display results
      this.displayPlantIdentification(plantId);
      this.displayPlantHealth(plantHealth);

      console.log('\n📊 SUMMARY:');
      console.log(`✅ Plant Identification: ${plantId ? 'Found' : 'Not Found'}`);
      console.log(`✅ Plant Health Assessment: ${plantHealth ? 'Found' : 'Not Found'}`);
      
    } catch (error) {
      this.log(`❌ Error: ${error.message}`, 'error');
    } finally {
      await this.sequelize.close();
      this.log('🔐 Database connection closed', 'info');
    }
  }
}

// Run the script
if (require.main === module) {
  const retriever = new AnalysisRetriever();
  retriever.run().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = AnalysisRetriever;