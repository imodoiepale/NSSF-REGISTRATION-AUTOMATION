import { chromium } from 'playwright';
import minimist from 'minimist';
import path from 'path';

const args = minimist(process.argv.slice(2));

const {
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://eservice.nssfkenya.co.ke/eApplicationMember/faces/newUser.xhtml');
  await page.getByRole('textbox', { name: 'Username:' }).fill(idNumber);
  await page.getByRole('textbox', { name: 'Password:', exact: true }).fill(idNumber);
  await page.getByRole('textbox', { name: 'Verify Password:' }).fill(idNumber);
  await page.getByRole('textbox', { name: 'ID No:' }).fill(idNumber);

  await page.getByRole('row', { name: 'ID Document Type:* Please' }).locator('span').click();
  await page.locator('#idDocType_panel').getByText('National Identity Card').click();
  await page.getByRole('textbox', { name: 'Nationality:' }).fill('4.24');
  await page.getByRole('textbox', { name: 'Country of Birth:' }).fill('4.24');
  await page.getByRole('textbox', { name: 'First Name:' }).fill(firstName);
  await page.getByRole('textbox', { name: 'Surname:' }).fill(surname);
  await page.getByRole('textbox', { name: 'Middle Name:' }).fill(middleName);
  await page.locator('td:nth-child(3) > .ui-radiobutton > .ui-radiobutton-box').first().click();
  await page.getByRole('textbox', { name: 'Date of Birth:' }).fill(dateOfBirth);
  await page.locator('#voluntaryFlg > tbody > tr > td:nth-child(3) > .ui-radiobutton > .ui-radiobutton-box').click();
  await page.getByRole('textbox', { name: 'P.O. Address 1:' }).fill('Nairobi,Kenya');
  await page.locator('#postalCode').fill('00100');
  await page.getByRole('textbox', { name: 'Telephone:' }).fill(mobileNumber);
  await page.getByRole('textbox', { name: 'Email:' }).fill(email);
  await page.getByRole('textbox', { name: 'County:' }).fill('1.01');
  await page.getByRole('textbox', { name: 'District:' }).fill('Nairobi');
  await page.getByRole('textbox', { name: 'Location:' }).fill('Nairobi');
  await page.getByRole('textbox', { name: 'District of Birth:' }).fill(districtOfBirth);

  await page.locator('#CaptchaID').click();
  await page.waitForTimeout(10000);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForSelector('#locationSelector2');

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
  });

  await context.close();
  await browser.close();
})();