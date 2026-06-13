import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export async function uploadToGoogleDrive(
  filePath: string,
  folderId: string,
  serviceAccountJsonString: string
): Promise<string> {
  try {
    const credentials = JSON.parse(serviceAccountJsonString);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileName = path.basename(filePath);
    const mimeType = 'application/zip';

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log(`[Google Drive] Uploaded file ${response.data.name} (ID: ${response.data.id})`);
    return response.data.id || '';
  } catch (error) {
    console.error('[Google Drive] Upload failed:', error);
    throw new Error(`Google Drive upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
