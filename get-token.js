const axios = require('axios');

axios.post('http://localhost:3000/api/v1/auth/login', {
  identifier: 'betttonny966@gmail.com',
  password: 'Password123'
}).then(response => {
  if (response.data.success) {
    console.log('🔑 Auth Token:', response.data.data.tokens.accessToken);
    console.log('\n📋 Test the Smart Calculator with:');
    console.log('curl -X POST http://localhost:3000/api/v1/enhanced-plant/yield \\');
    console.log('  -H "Authorization: Bearer ' + response.data.data.tokens.accessToken + '" \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"cropType":"maize","farmSize":2.5,"location":"Nakuru"}\'');
  } else {
    console.error('❌ Authentication failed:', response.data.message);
  }
}).catch(error => {
  console.error('❌ Error:', error.response?.data?.message || error.message);
});