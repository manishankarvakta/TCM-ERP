
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

async function debug() {
  console.log("--- Debugging File Visibility ---");

  // 1. List Users
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  console.log(`\nFound ${users.length} users:`);
  users.forEach(u => console.log(`- [${u.id}] ${u.email} (${u.name})`));

  // 2. List Files in DB
  const files = await prisma.file.findMany();
  console.log(`\nFound ${files.length} files in Database:`);
  files.forEach(f => {
    console.log(`- [${f.id}] Name: "${f.name}", Path: "${f.path}", Owner: ${f.ownerId}, Key: "${f.storageKey}"`);
  });

  // 3. List Objects in MinIO
  console.log("\nListing objects in MinIO (espaciofiles)...");
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const client = new S3Client({
    endpoint: `http://${endpoint}:9000`,
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });

  try {
      const command = new ListObjectsCommand({ Bucket: process.env.MINIO_BUCKET_NAME || 'espaciofiles' });
      const response = await client.send(command);
      const objects = response.Contents || [];
      console.log(`Found ${objects.length} objects in MinIO:`);
      objects.forEach(o => console.log(`- Key: "${o.Key}", Size: ${o.Size}`));

      // 4. Cross-reference
      console.log("\n--- Analysis ---");
      objects.forEach(obj => {
          const dbFile = files.find(f => f.storageKey === obj.Key);
          if (!dbFile) {
              console.warn(`WARNING: Object "${obj.Key}" exists in MinIO but NOT in Database!`);
          }
      });
      
      files.forEach(f => {
          const minioObj = objects.find(o => o.Key === f.storageKey);
          if (!minioObj) {
              console.warn(`WARNING: File "${f.name}" (ID: ${f.id}) exists in Database but NOT in MinIO!`);
          }
      });

      // 5. Simulate listFolder logic
      console.log("\n--- Simulating listFolder ---");
      const adminUser = users.find(u => u.email === 'admin@example.com');
      if (adminUser) {
          const userId = adminUser.id;
          const currentPath = "/"; // Simulate root path
          
          const normalizedPath = currentPath.replace(/^\/+/, "").replace(/\/+$/, "");
          console.log(`Querying for Owner: ${userId}, Path: "${normalizedPath || "/"}"`);
          
          const folderFiles = await prisma.file.findMany({
            where: {
              ownerId: userId,
              path: normalizedPath || "/",
            },
          });
          console.log(`Found ${folderFiles.length} files in folder.`);
          folderFiles.forEach(f => console.log(`- ${f.name} (${f.path})`));
      } else {
          console.error("Admin user not found for simulation");
      }

  } catch (err: any) {
      console.error("MinIO Error:", err.message);
  } finally {
      await prisma.$disconnect();
  }
}

debug();
