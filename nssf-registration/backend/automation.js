import { chromium } from 'playwright';
import minimist from 'minimist';
import path from 'path';
import os from 'os';

const args = minimist(process.argv.slice(2));

// Extract and convert all values to strings to prevent Playwright fill errors
const {
  requestId,
  firstName,
  middleName,
  surname,
  idNumber,
  dateOfBirth,
  districtOfBirth,
  mobileNumber,
  email,
  pdfPath
} = args;

// Ensure all values that will be used in form filling are strings
const formValues = {
  requestId: String(requestId),
  firstName: String(firstName),
  middleName: middleName ? String(middleName) : '',
  surname: String(surname),
  idNumber: String(idNumber),
  dateOfBirth: String(dateOfBirth),
  districtOfBirth: districtOfBirth ? String(districtOfBirth) : '',
  mobileNumber: String(mobileNumber),
  email: String(email),
  pdfPath: String(pdfPath)
};

// Function to report progress to parent process
const sendProgress = (percentage) => {
  console.log(`PROGRESS:${percentage}`);
};

(async () => {
  try {
    // Start the automation process
    sendProgress(10);
    
    // Explicitly set headless mode for cloud environment
    const browser = await chromium.launch({ 
      headless: false,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    sendProgress(20);

    // Navigate to the NSSF registration page
    await page.locator('body').click(); // Ensure page is focused
    await page.goto('https://eservice.nssfkenya.co.ke/eApplicationMember/faces/newUser.xhtml');
    sendProgress(25);
    
    // Fill in the login credentials using exact locators
    await page.getByRole('textbox', { name: 'Username:*' }).fill(formValues.idNumber);
    await page.getByRole('textbox', { name: 'Password:*', exact: true }).fill(formValues.idNumber);
    await page.getByRole('textbox', { name: 'Verify Password:*' }).fill(formValues.idNumber);
    await page.getByRole('textbox', { name: 'ID No:*' }).fill(formValues.idNumber);
    sendProgress(30);

    // Select ID document type
    await page.getByRole('row', { name: 'ID Document Type:* Please' }).locator('span').click();
    await page.locator('#idDocType_panel').getByText('National Identity Card').click();
    sendProgress(35);
    
    // Fill nationality and country of birth
    // Using the specific values from user's working script
    await page.getByRole('textbox', { name: 'Nationality:*' }).fill('4.24');
    await page.getByRole('textbox', { name: 'Country of Birth:*' }).fill('4.24');
    sendProgress(40);
    
    // Fill personal details
    await page.getByRole('textbox', { name: 'First Name:*' }).fill(formValues.firstName);
    await page.getByRole('textbox', { name: 'Surname:*' }).fill(formValues.surname);
    await page.getByRole('textbox', { name: 'Middle Name:' }).fill(formValues.middleName);
    sendProgress(45);
    
    // Select gender and fill DOB - using exact selector from working script
    await page.locator('td:nth-child(3) > .ui-radiobutton > .ui-radiobutton-box').first().click();
    await page.getByRole('textbox', { name: 'Date of Birth:*' }).fill(formValues.dateOfBirth);
    sendProgress(50);
    
    // Select voluntary flag
    await page.locator('#voluntaryFlg > tbody > tr > td:nth-child(3) > .ui-radiobutton > .ui-radiobutton-box').click();
    sendProgress(55);
    
    // Fill address details
    await page.getByRole('textbox', { name: 'P.O. Address 1:*' }).fill('Nairobi,Kenya');
    await page.locator('#postalCode').fill('00100');
    sendProgress(60);
    
    // Fill contact details
    await page.getByRole('textbox', { name: 'Telephone:' }).fill(formValues.mobileNumber);
    await page.getByRole('textbox', { name: 'Email:' }).fill(formValues.email);
    sendProgress(65);
    
    // Fill location details
    await page.getByRole('textbox', { name: 'County:*' }).fill('1.01');
    await page.getByRole('textbox', { name: 'District:*' }).fill('Nairobi');
    await page.getByRole('textbox', { name: 'Location:*' }).fill('Nairobi');
    await page.getByRole('textbox', { name: 'District of Birth:*' }).fill(formValues.districtOfBirth);
    sendProgress(70);

    // Handle CAPTCHA - capture the image and wait for user input
    await page.locator('#CaptchaID').click();
    sendProgress(75);
    
    // Take a screenshot of just the CAPTCHA image
    let captchaImg;
    try {
      captchaImg = await page.locator('#CaptchaImgID').screenshot();
      console.log('Successfully captured CAPTCHA image');
    } catch (imgError) {
      console.error('Error capturing CAPTCHA image:', imgError.message);
      // Try an alternative method
      try {
        captchaImg = await page.screenshot({ clip: { x: 600, y: 450, width: 200, height: 50 } });
        console.log('Captured CAPTCHA using clip method');
      } catch (clipError) {
        console.error('Failed to capture CAPTCHA with clip method:', clipError.message);
      }
    }
    
    // Convert the image to base64 and send it with progress update
    if (captchaImg) {
      const captchaBase64 = captchaImg.toString('base64');
      // Send the CAPTCHA image to the frontend
      sendProgress(requestId, 'captcha_ready', 80, null, captchaBase64);
      console.log('CAPTCHA_IMAGE_SENT');
    } else {
      console.error('Unable to capture CAPTCHA image');
      sendProgress(requestId, 'error', 75, 'Failed to capture CAPTCHA image');
    }
    
    // Wait for user input from WebSocket - this would be implemented in server.js
    // This is a placeholder for demo purposes - in production we'd listen for the captchaText
    console.log('Waiting for CAPTCHA input from user...');
    
        // Create a promise that will be resolved when CAPTCHA text is received
    const captchaPromise = new Promise((resolve) => {
      // Store the resolver in global scope so it can be called from server.js
      global.resolveCaptchaFor = global.resolveCaptchaFor || {};
      global.resolveCaptchaFor[requestId] = resolve;
      
      // Set a timeout to avoid hanging the process indefinitely
      setTimeout(() => {
        // If no CAPTCHA input after 2 minutes, resolve with error
        if (global.resolveCaptchaFor[requestId]) {
          resolve({ error: 'CAPTCHA input timeout' });
          delete global.resolveCaptchaFor[requestId];
        }
      }, 120000); // 2 minutes timeout
    });
    
    // Wait for the promise to be resolved with CAPTCHA text
    const captchaResult = await captchaPromise;
    
    // Check if we received an error or actual CAPTCHA text
    if (captchaResult.error) {
      throw new Error(captchaResult.error);
    }
    
    // Input the CAPTCHA text provided by the user
    console.log(`Inputting CAPTCHA text: ${captchaResult.text}`);
    try {
      // Try multiple strategies to fill in the CAPTCHA
      // Strategy 1: Using standard locator
      await page.locator('#CaptchaID').fill(captchaResult.text);
      console.log('Filled CAPTCHA using #CaptchaID selector');
    } catch (error) {
      console.error('Error filling CAPTCHA with #CaptchaID:', error.message);
      
      try {
        // Strategy 2: Using alternate selectors if the first one fails
        await page.locator('input[name="CaptchaID"]').fill(captchaResult.text);
        console.log('Filled CAPTCHA using input[name="CaptchaID"] selector');
      } catch (error2) {
        console.error('Error filling CAPTCHA with alternate selector:', error2.message);
        
        try {
          // Strategy 3: Using general input near the CAPTCHA image
          const captchaInputs = await page.$$('input[type="text"]');
          if (captchaInputs.length > 0) {
            // Assuming the CAPTCHA input is one of the text inputs on the page
            await captchaInputs[captchaInputs.length - 1].fill(captchaResult.text);
            console.log('Filled CAPTCHA using last text input on page');
          } else {
            throw new Error('No text inputs found on page');
          }
        } catch (error3) {
          console.error('All CAPTCHA filling strategies failed:', error3.message);
          throw new Error('Unable to fill CAPTCHA text');
        }
      }
    }
    
    // Click save button - using exact locator from working script
    await page.getByRole('button', { name: 'Save' }).click();
    sendProgress(85);
    
    // Wait for the next page to load, indicated by the locationSelector2 element
    await page.waitForSelector('#locationSelector2');
    sendProgress(90);

    // Generate PDF with formatted name - This is a direct copy from the working script approach
    const fullName = `${formValues.firstName} ${formValues.middleName} ${formValues.surname}`.trim();
    const downloadsPath = process.env.OUTPUT_DIR || path.join(os.homedir(), 'Downloads');
    
    // Make sure the directory exists
    try {
      await page.pdf({
        path: formValues.pdfPath,
        format: 'A4',
        printBackground: true,
      });
      sendProgress(95);
      console.log(`PDF has been saved successfully at: ${formValues.pdfPath}`);
    } catch (pdfError) {
      console.error(`Error generating PDF: ${pdfError.message}`);
      // Take a screenshot as fallback
      await page.screenshot({ path: formValues.pdfPath.replace('.pdf', '.png'), fullPage: true });
    }

    // Clean up resources
    await browser.close();
    sendProgress(100);

    console.log('NSSF Registration completed successfully!');
    return { success: true, message: 'Registration completed successfully' };
  } catch (error) {
    console.error('Automation failed:', error);
    process.exit(1);
  }
})();