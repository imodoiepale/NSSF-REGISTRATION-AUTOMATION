import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const upload = multer();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.post('/api/submit-form', upload.none(), async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      surname,
      idNumber,
      dateOfBirth,
      districtOfBirth,
      mobileNumber,
      email
    } = req.body;

    // Generate a unique PDF output path
    const outDir = process.env.OUTPUT_DIR || '/tmp';
    const pdfFileName = `NSSF_${idNumber}_${Date.now()}.pdf`;
    const pdfPath = path.join(outDir, pdfFileName);

    // Spawn the Playwright automation script
    const args = [
      '--firstName', firstName,
      '--middleName', middleName,
      '--surname', surname,
      '--idNumber', idNumber,
      '--dateOfBirth', dateOfBirth,
      '--districtOfBirth', districtOfBirth,
      '--mobileNumber', mobileNumber,
      '--email', email,
      '--pdfPath', pdfPath
    ];

    const child = spawn('node', ['automation.js', ...args], { stdio: 'inherit' });

    child.on('exit', (code) => {
      if (code !== 0) {
        res.status(500).json({ success: false, message: 'Automation failed' });
        return;
      }
      // Read PDF as base64 and send to client
      fs.readFile(pdfPath, { encoding: 'base64' }, (err, data) => {
        if (err) {
          res.status(500).json({ success: false, message: 'Failed to read PDF' });
        } else {
          res.json({ success: true, pdfData: data });
        }
        // Clean up PDF file
        fs.unlink(pdfPath, () => {});
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});