import 'dotenv/config';
import { minio } from './lib/minio';

import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

async function checkCreds(accessKey: string, secretKey: string, endpoint: string) {
    console.log(`Testing credentials: ${accessKey} / ${secretKey.substring(0, 3)}...`);
    const client = new S3Client({
        endpoint: `http://${endpoint}:9000`, // Assuming http and port 9000 for verification
        region: "us-east-1",
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
        forcePathStyle: true,
    });

    try {
        const command = new ListBucketsCommand({});
        const data = await client.send(command);
        console.log("SUCCESS! Connected.");
        return true;
    } catch (err: any) {
        console.log("FAILED:", err.message);
        return false;
    }
}

async function verify() {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const currentAccess = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const currentSecret = process.env.MINIO_SECRET_KEY || 'minioadmin';

  console.log("--- Testing Current .env Credentials ---");
  const success1 = await checkCreds(currentAccess, currentSecret, endpoint);

  if (!success1) {
      console.log("\n--- Testing Default 'minioadmin' Credentials ---");
      const success2 = await checkCreds('minioadmin', 'minioadmin', endpoint);
      
      if (success2) {
          console.log("\nCONCLUSION: The credentials in .env are INCORRECT. Use 'minioadmin' / 'minioadmin'.");
      } else {
          console.log("\nCONCLUSION: Both credentials failed. Ensure MinIO is running.");
      }
  } else {
      console.log("\nCONCLUSION: The credentials in .env are CORRECT (for list buckets). Connection working.");
      
      // Check if bucket exists
      const bucketName = process.env.MINIO_BUCKET_NAME || 'espaciofiles';
      console.log(`\nChecking for bucket: ${bucketName}...`);
      
      const client = new S3Client({
        endpoint: `http://${endpoint}:9000`,
        region: "us-east-1",
        credentials: {
            accessKeyId: currentAccess,
            secretAccessKey: currentSecret,
        },
        forcePathStyle: true,
      });

      try {
          const buckets = await client.send(new ListBucketsCommand({}));
          const exists = buckets.Buckets?.some(b => b.Name === bucketName);
          
          if (exists) {
              console.log(`PASS: Bucket '${bucketName}' exists.`);
          } else {
              console.log(`FAIL: Bucket '${bucketName}' does NOT exist.`);
              console.log("Attempting to create bucket...");
              const { CreateBucketCommand } = await import("@aws-sdk/client-s3");
              await client.send(new CreateBucketCommand({ Bucket: bucketName }));
              console.log(`SUCCESS: Bucket '${bucketName}' created.`);
          }
      } catch (err: any) {
          console.error("Error checking/creating bucket:", err.message);
      }
  }
}


verify();
