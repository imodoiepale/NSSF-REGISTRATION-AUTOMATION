// Test script for CAPTCHA handling
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create a simple test image to simulate CAPTCHA
const createTestCaptcha = () => {
  console.log('Creating test CAPTCHA image...');
  const testDir = path.join(__dirname, 'test');
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create an example CAPTCHA text
  const captchaText = '123ABC';
  console.log(`Test CAPTCHA text is: ${captchaText}`);
  
  // Save the text to a file for reference
  fs.writeFileSync(path.join(testDir, 'captcha-text.txt'), captchaText);
  
  return {
    captchaDir: testDir,
    captchaText
  };
};

// Simulate the CAPTCHA flow
const testCaptchaFlow = () => {
  try {
    // Set the global resolver for testing
    global.resolveCaptchaFor = global.resolveCaptchaFor || {};
    const testRequestId = 'test-' + Date.now();
    
    // Create a promise to be resolved
    const captchaPromise = new Promise((resolve) => {
      // Store the resolver
      global.resolveCaptchaFor[testRequestId] = resolve;
      
      console.log(`Created a test CAPTCHA promise for requestId: ${testRequestId}`);
      console.log('Waiting for resolution...');
      
      // Resolve after a short time to simulate user input
      setTimeout(() => {
        if (global.resolveCaptchaFor[testRequestId]) {
          console.log('Simulating user entering CAPTCHA text: "123ABC"');
          global.resolveCaptchaFor[testRequestId]({ text: '123ABC' });
          delete global.resolveCaptchaFor[testRequestId];
        }
      }, 3000);
    });
    
    // Handle the resolved promise
    captchaPromise.then((result) => {
      console.log('CAPTCHA promise resolved with:', result);
      console.log('Test completed successfully!');
    });
  } catch (error) {
    console.error('Error in CAPTCHA flow test:', error);
  }
};

// Check server connectivity
const checkServerConnectivity = async () => {
  console.log('Testing server connectivity...');
  
  try {
    // Try connecting to local server
    console.log('Testing connection to local server (http://localhost:3001)...');
    const localResult = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health');
    console.log(`Local server response status: ${localResult.toString()}`);
    console.log('Local server is accessible ✅');
  } catch (error) {
    console.error('Error connecting to local server:', error.message);
    console.log('Local server is NOT accessible ❌');
  }
  
  try {
    // Try connecting to hosted server
    console.log('Testing connection to hosted server (https://nssf-backend-production.up.railway.app)...');
    const hostedResult = execSync('curl -s -o /dev/null -w "%{http_code}" https://nssf-backend-production.up.railway.app/health');
    console.log(`Hosted server response status: ${hostedResult.toString()}`);
    console.log('Hosted server is accessible ✅');
  } catch (error) {
    console.error('Error connecting to hosted server:', error.message);
    console.log('Hosted server is NOT accessible ❌');
  }
};

// Main test function
const runTests = async () => {
  console.log('=== NSSF CAPTCHA and Server Connectivity Test ===');
  
  // Test server connectivity
  await checkServerConnectivity();
  
  // Test CAPTCHA flow
  console.log('\n=== Testing CAPTCHA Flow ===');
  const { captchaText } = createTestCaptcha();
  testCaptchaFlow();
  
  console.log('\nTests completed. Check the output above for results.');
};

// Run all tests
runTests();
