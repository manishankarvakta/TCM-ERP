const { uploadFileServerSide } = require('../app/actions/files');
const fs = require('fs/promises');
const path = require('path');

async function testImage() {
  try {
    // Create a dummy red pixel PNG base64
    const redPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    console.log('Uploading test-image.png...');
    const result = await uploadFileServerSide({
      path: '',
      name: 'test-image.png',
      fileData: redPixelBase64,
      contentType: 'image/png',
      size: 70
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      const key = result.data.key;
      const localPath = path.join(process.cwd(), 'uploads', key);
      try {
        await fs.access(localPath);
        console.log('[SUCCESS] File exists on disk at:', localPath);
      } catch (e) {
        console.log('[FAILED] File NOT found on disk at:', localPath);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// We need to mock auth for this to work in a script
// But since I'm running on the server, maybe I can just skip it if I modify the action temporarily?
// No, I'll try to run it. It might fail on auth.
testImage();
