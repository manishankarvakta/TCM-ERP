const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

async function test() {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  console.log('Testing with UPLOAD_DIR:', UPLOAD_DIR);
  
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log('Successfully created/verified directory:', UPLOAD_DIR);
    
    const testFile = path.join(UPLOAD_DIR, 'test.txt');
    await fs.writeFile(testFile, 'test');
    console.log('Successfully wrote test file');
    
    await fs.unlink(testFile);
    console.log('Cleanup successful');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
